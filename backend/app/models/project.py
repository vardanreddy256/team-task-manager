"""Project and team-membership models."""
import enum
from datetime import datetime
from sqlalchemy import (
    Column,
    Integer,
    String,
    DateTime,
    ForeignKey,
    Enum,
    UniqueConstraint,
    Text,
)
from sqlalchemy.orm import relationship

from app.database import Base


class ProjectRole(str, enum.Enum):
    ADMIN = "admin"
    MEMBER = "member"


class Project(Base):
    __tablename__ = "projects"

    id = Column(Integer, primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    description = Column(Text, nullable=True)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    owner = relationship("User", back_populates="owned_projects")
    memberships = relationship(
        "ProjectMembership",
        back_populates="project",
        cascade="all, delete-orphan",
    )
    tasks = relationship(
        "Task", back_populates="project", cascade="all, delete-orphan"
    )


class ProjectMembership(Base):
    __tablename__ = "project_memberships"
    __table_args__ = (
        UniqueConstraint("project_id", "user_id", name="uq_project_user"),
    )

    id = Column(Integer, primary_key=True, index=True)
    project_id = Column(
        Integer, ForeignKey("projects.id", ondelete="CASCADE"), nullable=False
    )
    user_id = Column(
        Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False
    )
    role = Column(
        Enum(ProjectRole, name="project_role"),
        nullable=False,
        default=ProjectRole.MEMBER,
    )
    joined_at = Column(DateTime, default=datetime.utcnow, nullable=False)

    project = relationship("Project", back_populates="memberships")
    user = relationship("User", back_populates="memberships")
