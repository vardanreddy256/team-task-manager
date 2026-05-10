"""Project CRUD + member management."""
from typing import List
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.core.deps import (
    get_current_user,
    get_project_membership,
    require_project_admin,
)
from app.database import get_db
from app.models.project import Project, ProjectMembership, ProjectRole
from app.models.task import Task
from app.models.user import User
from app.schemas.project import (
    AddMemberRequest,
    MembershipOut,
    ProjectCreate,
    ProjectDetail,
    ProjectOut,
    ProjectUpdate,
    UpdateMemberRoleRequest,
)

router = APIRouter(prefix="/api/projects", tags=["projects"])


@router.get("", response_model=List[ProjectOut])
def list_my_projects(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    """All projects the current user is a member of."""
    return (
        db.query(Project)
        .join(ProjectMembership, ProjectMembership.project_id == Project.id)
        .filter(ProjectMembership.user_id == user.id)
        .order_by(Project.created_at.desc())
        .all()
    )


@router.post("", response_model=ProjectOut, status_code=status.HTTP_201_CREATED)
def create_project(
    payload: ProjectCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project = Project(
        name=payload.name,
        description=payload.description,
        owner_id=user.id,
    )
    db.add(project)
    db.flush()

    # Owner is automatically an admin member.
    db.add(
        ProjectMembership(
            project_id=project.id, user_id=user.id, role=ProjectRole.ADMIN
        )
    )
    db.commit()
    db.refresh(project)
    return project


@router.get("/{project_id}", response_model=ProjectDetail)
def get_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project, membership = get_project_membership(project_id, db, user)
    members = (
        db.query(ProjectMembership)
        .filter(ProjectMembership.project_id == project_id)
        .order_by(ProjectMembership.joined_at.asc())
        .all()
    )
    task_count = (
        db.query(func.count(Task.id))
        .filter(Task.project_id == project_id)
        .scalar()
        or 0
    )
    return ProjectDetail(
        id=project.id,
        name=project.name,
        description=project.description,
        owner=project.owner,
        created_at=project.created_at,
        members=members,
        my_role=membership.role,
        task_count=task_count,
    )


@router.patch("/{project_id}", response_model=ProjectOut)
def update_project(
    project_id: int,
    payload: ProjectUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project, membership = get_project_membership(project_id, db, user)
    require_project_admin(project, membership)

    data = payload.model_dump(exclude_unset=True)
    for field, value in data.items():
        setattr(project, field, value)
    db.commit()
    db.refresh(project)
    return project


@router.delete("/{project_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_project(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project, _ = get_project_membership(project_id, db, user)
    if project.owner_id != user.id:
        raise HTTPException(
            status_code=403, detail="Only the project owner can delete a project"
        )
    db.delete(project)
    db.commit()


# ----- members -------------------------------------------------------------


@router.get("/{project_id}/members", response_model=List[MembershipOut])
def list_members(
    project_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_project_membership(project_id, db, user)
    return (
        db.query(ProjectMembership)
        .filter(ProjectMembership.project_id == project_id)
        .order_by(ProjectMembership.joined_at.asc())
        .all()
    )


@router.post(
    "/{project_id}/members",
    response_model=MembershipOut,
    status_code=status.HTTP_201_CREATED,
)
def add_member(
    project_id: int,
    payload: AddMemberRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project, membership = get_project_membership(project_id, db, user)
    require_project_admin(project, membership)

    target = db.query(User).filter(User.email == payload.email).first()
    if not target:
        raise HTTPException(status_code=404, detail="User with that email not found")

    existing = (
        db.query(ProjectMembership)
        .filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == target.id,
        )
        .first()
    )
    if existing:
        raise HTTPException(status_code=400, detail="User is already a member")

    new_membership = ProjectMembership(
        project_id=project_id,
        user_id=target.id,
        role=payload.role,
    )
    db.add(new_membership)
    db.commit()
    db.refresh(new_membership)
    return new_membership


@router.patch(
    "/{project_id}/members/{user_id}",
    response_model=MembershipOut,
)
def update_member_role(
    project_id: int,
    user_id: int,
    payload: UpdateMemberRoleRequest,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project, membership = get_project_membership(project_id, db, user)
    require_project_admin(project, membership)

    target = (
        db.query(ProjectMembership)
        .filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == user_id,
        )
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="Membership not found")
    if target.user_id == project.owner_id and payload.role != ProjectRole.ADMIN:
        raise HTTPException(
            status_code=400, detail="The project owner must remain an admin"
        )
    target.role = payload.role
    db.commit()
    db.refresh(target)
    return target


@router.delete(
    "/{project_id}/members/{user_id}",
    status_code=status.HTTP_204_NO_CONTENT,
)
def remove_member(
    project_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project, membership = get_project_membership(project_id, db, user)

    # Members can remove themselves; admins can remove anyone except the owner.
    if user_id != user.id:
        require_project_admin(project, membership)
    if user_id == project.owner_id:
        raise HTTPException(
            status_code=400, detail="Cannot remove the project owner"
        )

    target = (
        db.query(ProjectMembership)
        .filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == user_id,
        )
        .first()
    )
    if not target:
        raise HTTPException(status_code=404, detail="Membership not found")
    db.delete(target)
    db.commit()
