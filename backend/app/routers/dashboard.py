"""Aggregated dashboard endpoint."""
from datetime import datetime, timezone

from fastapi import APIRouter, Depends
from sqlalchemy import func, or_
from sqlalchemy.orm import Session

from app.core.deps import get_current_user
from app.database import get_db
from app.models.project import Project, ProjectMembership
from app.models.task import Task, TaskStatus
from app.models.user import User
from app.routers.tasks import _to_out
from app.schemas.dashboard import DashboardSummary, StatusCounts

router = APIRouter(prefix="/api/dashboard", tags=["dashboard"])


@router.get("", response_model=DashboardSummary)
def dashboard(
    db: Session = Depends(get_db),
    user: User = Depends(get_current_user),
):
    # Tasks visible to user = tasks in any project they are a member of.
    visible_task_q = (
        db.query(Task)
        .join(ProjectMembership, ProjectMembership.project_id == Task.project_id)
        .filter(ProjectMembership.user_id == user.id)
    )

    total_tasks = visible_task_q.count()

    rows = (
        visible_task_q.with_entities(Task.status, func.count(Task.id))
        .group_by(Task.status)
        .all()
    )
    status_counts = StatusCounts()
    for s, count in rows:
        if s == TaskStatus.TODO:
            status_counts.todo = count
        elif s == TaskStatus.IN_PROGRESS:
            status_counts.in_progress = count
        elif s == TaskStatus.DONE:
            status_counts.done = count

    now = datetime.now(timezone.utc)
    overdue_q = visible_task_q.filter(
        Task.due_date.isnot(None),
        Task.due_date < now,
        Task.status != TaskStatus.DONE,
    )
    overdue_count = overdue_q.count()

    my_open_tasks = (
        visible_task_q.filter(
            Task.assignee_id == user.id,
            Task.status != TaskStatus.DONE,
        )
        .order_by(Task.due_date.asc().nullslast(), Task.created_at.desc())
        .limit(10)
        .all()
    )

    overdue_tasks = (
        overdue_q.filter(
            or_(Task.assignee_id == user.id, Task.creator_id == user.id)
        )
        .order_by(Task.due_date.asc())
        .limit(10)
        .all()
    )

    project_count = (
        db.query(func.count(Project.id))
        .join(ProjectMembership, ProjectMembership.project_id == Project.id)
        .filter(ProjectMembership.user_id == user.id)
        .scalar()
        or 0
    )

    return DashboardSummary(
        total_tasks=total_tasks,
        status_counts=status_counts,
        overdue_count=overdue_count,
        my_open_tasks=[_to_out(t) for t in my_open_tasks],
        overdue_tasks=[_to_out(t) for t in overdue_tasks],
        project_count=project_count,
    )
