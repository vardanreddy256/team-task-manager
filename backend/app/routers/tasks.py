"""Task CRUD nested under projects."""
from datetime import datetime, timezone
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from app.core.deps import (
    get_current_user,
    get_project_membership,
    require_project_admin,
)
from app.database import get_db
from app.models.project import ProjectMembership, ProjectRole
from app.models.task import Task, TaskStatus, TaskPriority
from app.models.user import User
from app.schemas.task import TaskCreate, TaskOut, TaskUpdate

router = APIRouter(prefix="/api/projects/{project_id}/tasks", tags=["tasks"])


def _is_overdue(task: Task) -> bool:
    if not task.due_date or task.status == TaskStatus.DONE:
        return False
    due = task.due_date
    if due.tzinfo is None:
        due = due.replace(tzinfo=timezone.utc)
    return due < datetime.now(timezone.utc)


def _to_out(task: Task) -> TaskOut:
    return TaskOut(
        id=task.id,
        title=task.title,
        description=task.description,
        status=task.status,
        priority=task.priority,
        due_date=task.due_date,
        project_id=task.project_id,
        creator=task.creator,
        assignee=task.assignee,
        created_at=task.created_at,
        updated_at=task.updated_at,
        is_overdue=_is_overdue(task),
    )


def _ensure_assignee_is_member(
    db: Session, project_id: int, user_id: Optional[int]
) -> None:
    if user_id is None:
        return
    member = (
        db.query(ProjectMembership)
        .filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == user_id,
        )
        .first()
    )
    if not member:
        raise HTTPException(
            status_code=400, detail="Assignee must be a member of the project"
        )


@router.get("", response_model=List[TaskOut])
def list_tasks(
    project_id: int,
    status_filter: Optional[TaskStatus] = Query(None, alias="status"),
    assignee_id: Optional[int] = Query(None),
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_project_membership(project_id, db, user)

    query = db.query(Task).filter(Task.project_id == project_id)
    if status_filter:
        query = query.filter(Task.status == status_filter)
    if assignee_id is not None:
        query = query.filter(Task.assignee_id == assignee_id)

    tasks = query.order_by(Task.created_at.desc()).all()
    return [_to_out(t) for t in tasks]


@router.post("", response_model=TaskOut, status_code=status.HTTP_201_CREATED)
def create_task(
    project_id: int,
    payload: TaskCreate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project, membership = get_project_membership(project_id, db, user)
    require_project_admin(project, membership)
    _ensure_assignee_is_member(db, project_id, payload.assignee_id)

    task = Task(
        project_id=project_id,
        creator_id=user.id,
        title=payload.title,
        description=payload.description,
        status=payload.status,
        priority=payload.priority,
        due_date=payload.due_date,
        assignee_id=payload.assignee_id,
    )
    db.add(task)
    db.commit()
    db.refresh(task)
    return _to_out(task)


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    get_project_membership(project_id, db, user)
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.project_id == project_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    return _to_out(task)


@router.patch("/{task_id}", response_model=TaskOut)
def update_task(
    project_id: int,
    task_id: int,
    payload: TaskUpdate,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project, membership = get_project_membership(project_id, db, user)
    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.project_id == project_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")

    data = payload.model_dump(exclude_unset=True)

    # Members may only update tasks assigned to them, and only the status field.
    if membership.role != ProjectRole.ADMIN:
        if task.assignee_id != user.id:
            raise HTTPException(
                status_code=403,
                detail="Members can only update tasks assigned to them",
            )
        allowed = {"status"}
        if not set(data.keys()).issubset(allowed):
            raise HTTPException(
                status_code=403,
                detail="Members can only update the status field",
            )

    if "assignee_id" in data:
        _ensure_assignee_is_member(db, project_id, data["assignee_id"])

    for field, value in data.items():
        setattr(task, field, value)
    db.commit()
    db.refresh(task)
    return _to_out(task)


@router.delete("/{task_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_task(
    project_id: int,
    task_id: int,
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    project, membership = get_project_membership(project_id, db, user)
    require_project_admin(project, membership)

    task = (
        db.query(Task)
        .filter(Task.id == task_id, Task.project_id == project_id)
        .first()
    )
    if not task:
        raise HTTPException(status_code=404, detail="Task not found")
    db.delete(task)
    db.commit()
