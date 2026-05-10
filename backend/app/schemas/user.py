"""User Pydantic schemas."""
from datetime import datetime
from pydantic import BaseModel, EmailStr, Field, ConfigDict


class UserBase(BaseModel):
    email: EmailStr
    full_name: str = Field(..., min_length=1, max_length=255)


class UserCreate(UserBase):
    password: str = Field(..., min_length=8, max_length=128)


class UserOut(UserBase):
    model_config = ConfigDict(from_attributes=True)
    id: int
    is_active: bool
    created_at: datetime


class UserBrief(BaseModel):
    """Trimmed view used inside other resources (e.g., task assignee)."""
    model_config = ConfigDict(from_attributes=True)
    id: int
    email: EmailStr
    full_name: str
