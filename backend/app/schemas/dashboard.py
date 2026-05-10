"""Dashboard summary schemas."""
from typing import List
from pydantic import BaseModel
from app.schemas.task import TaskOut


class StatusCounts(BaseModel):
    todo: int = 0
    in_progress: int = 0
    done: int = 0


class DashboardSummary(BaseModel):
    total_tasks: int
    status_counts: StatusCounts
    overdue_count: int
    my_open_tasks: List[TaskOut]
    overdue_tasks: List[TaskOut]
    project_count: int
