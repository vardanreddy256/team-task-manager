"""Project + membership schemas."""
from datetime import datetime
from typing import List, Optional
from pydantic import BaseModel, EmailStr, Field, ConfigDict

from app.models.project import ProjectRole
from app.schemas.user import UserBrief


class ProjectBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)


class ProjectCreate(ProjectBase):
    pass


class ProjectUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    description: Optional[str] = Field(None, max_length=2000)


class MembershipOut(BaseModel):
    model_config = ConfigDict(from_attributes=True)
    id: int
    user: UserBrief
    role: ProjectRole
    joined_at: datetime


class ProjectOut(ProjectBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    owner: UserBrief
    created_at: datetime


class ProjectDetail(ProjectOut):
    members: List[MembershipOut] = []
    my_role: Optional[ProjectRole] = None
    task_count: int = 0


class AddMemberRequest(BaseModel):
    email: EmailStr
    role: ProjectRole = ProjectRole.MEMBER


class UpdateMemberRoleRequest(BaseModel):
    role: ProjectRole
