"""User model."""
from datetime import datetime
from sqlalchemy import Column, Integer, String, DateTime, Boolean
from sqlalchemy.orm import relationship

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    full_name = Column(String(255), nullable=False)
    hashed_password = Column(String(255), nullable=False)
    is_active = Column(Boolean, default=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    # Relationships
    owned_projects = relationship(
        "Project", back_populates="owner", cascade="all, delete-orphan"
    )
    memberships = relationship(
        "ProjectMembership", back_populates="user", cascade="all, delete-orphan"
    )
    created_tasks = relationship(
        "Task", foreign_keys="Task.creator_id", back_populates="creator"
    )
    assigned_tasks = relationship(
        "Task", foreign_keys="Task.assignee_id", back_populates="assignee"
    )
