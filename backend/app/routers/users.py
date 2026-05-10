"""User search (used to find people to add to projects)."""
from typing import List
from fastapi import APIRouter, Depends, Query
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.user import User
from app.schemas.user import UserBrief

router = APIRouter(prefix="/api/users", tags=["users"])


@router.get("/search", response_model=List[UserBrief])
def search_users(
    q: str = Query(..., min_length=1, max_length=255),
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    """Find users by partial email or name match."""
    pattern = f"%{q.lower()}%"
    return (
        db.query(User)
        .filter(
            (User.email.ilike(pattern)) | (User.full_name.ilike(pattern)),
            User.is_active.is_(True),
        )
        .limit(20)
        .all()
    )
