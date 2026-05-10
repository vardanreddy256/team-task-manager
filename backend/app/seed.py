"""Seed script: create demo users, a project, and a few tasks.

Run inside the backend folder: `python -m app.seed`
"""
from datetime import datetime, timedelta, timezone

from app.core.security import hash_password
from app.database import Base, SessionLocal, engine
from app.models.project import Project, ProjectMembership, ProjectRole
from app.models.task import Task, TaskPriority, TaskStatus
from app.models.user import User


def seed():
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if db.query(User).count() > 0:
            print("Database already seeded — skipping.")
            return

        admin = User(
            email="admin@example.com",
            full_name="Ada Admin",
            hashed_password=hash_password("password123"),
        )
        member = User(
            email="member@example.com",
            full_name="Mark Member",
            hashed_password=hash_password("password123"),
        )
        db.add_all([admin, member])
        db.flush()

        project = Project(
            name="Website Redesign",
            description="Q3 marketing site refresh.",
            owner_id=admin.id,
        )
        db.add(project)
        db.flush()

        db.add_all([
            ProjectMembership(project_id=project.id, user_id=admin.id, role=ProjectRole.ADMIN),
            ProjectMembership(project_id=project.id, user_id=member.id, role=ProjectRole.MEMBER),
        ])

        now = datetime.now(timezone.utc)
        db.add_all([
            Task(
                project_id=project.id,
                creator_id=admin.id,
                assignee_id=member.id,
                title="Draft new homepage hero",
                description="Two concept directions, lock copy by Friday.",
                status=TaskStatus.IN_PROGRESS,
                priority=TaskPriority.HIGH,
                due_date=now + timedelta(days=3),
            ),
            Task(
                project_id=project.id,
                creator_id=admin.id,
                assignee_id=admin.id,
                title="Audit current site analytics",
                status=TaskStatus.TODO,
                priority=TaskPriority.MEDIUM,
                due_date=now - timedelta(days=1),  # overdue
            ),
            Task(
                project_id=project.id,
                creator_id=admin.id,
                assignee_id=member.id,
                title="Pick a CMS",
                status=TaskStatus.DONE,
                priority=TaskPriority.LOW,
            ),
        ])

        db.commit()
        print("Seeded:")
        print("  admin@example.com / password123")
        print("  member@example.com / password123")
    finally:
        db.close()


if __name__ == "__main__":
    seed()
