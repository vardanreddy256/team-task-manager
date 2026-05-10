"""Shared FastAPI dependencies for auth and project access control."""
from typing import Tuple

from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from jose import JWTError
from sqlalchemy.orm import Session

from app.core.security import decode_token, ACCESS_TOKEN_TYPE
from app.database import get_db
from app.models.project import Project, ProjectMembership, ProjectRole
from app.models.user import User

oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login", auto_error=False)


def get_current_user(
    token: str | None = Depends(oauth2_scheme),
    db: Session = Depends(get_db),
) -> User:
    if not token:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Not authenticated",
            headers={"WWW-Authenticate": "Bearer"},
        )
    try:
        payload = decode_token(token, expected_type=ACCESS_TOKEN_TYPE)
        user_id = int(payload["sub"])
    except (JWTError, KeyError, ValueError):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Invalid or expired token",
            headers={"WWW-Authenticate": "Bearer"},
        )

    user = db.query(User).filter(User.id == user_id).first()
    if not user or not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found or inactive",
        )
    return user


def get_project_membership(
    project_id: int,
    db: Session,
    user: User,
) -> Tuple[Project, ProjectMembership]:
    """Look up a project and the current user's membership in it.

    Raises 404 if the project doesn't exist, 403 if the user is not a member.
    """
    project = db.query(Project).filter(Project.id == project_id).first()
    if not project:
        raise HTTPException(status_code=404, detail="Project not found")

    membership = (
        db.query(ProjectMembership)
        .filter(
            ProjectMembership.project_id == project_id,
            ProjectMembership.user_id == user.id,
        )
        .first()
    )
    if not membership:
        raise HTTPException(
            status_code=403, detail="You are not a member of this project"
        )
    return project, membership


def require_project_admin(
    project: Project, membership: ProjectMembership
) -> None:
    """Raise 403 unless the membership grants admin rights."""
    if membership.role != ProjectRole.ADMIN:
        raise HTTPException(
            status_code=403, detail="Admin role required for this action"
        )
