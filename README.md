# Team Task Manager

A full-stack web app where users sign up, create projects, invite teammates, assign tasks, and track progress with role-based access control (Admin / Member).

- **Live URL: https://frontend-production-6a156.up.railway.app
- **Demo video:https://drive.google.com/file/d/1Mh8QX-YkNfEiTg_Y5vm1wtdJ1Z1LP2Bw/view?usp=sharing

## Stack

| Layer    | Technology                                        |
| -------- | ------------------------------------------------- |
| Frontend | Next.js 14 (App Router) · React 18 · TypeScript · Tailwind CSS |
| Backend  | Python 3.11 · FastAPI · SQLAlchemy · Pydantic v2  |
| Database | PostgreSQL                                        |
| Auth     | JWT access + refresh tokens (HS256, bcrypt-hashed passwords) |
| Hosting  | Railway (3 services: frontend, backend, Postgres) |

## Features

- **Authentication** — signup, login, `/me`, refresh-token flow, bcrypt password hashing.
- **Projects** — create, edit, delete (owner only); list projects you belong to.
- **Team management** — admins invite members by email and can promote members to admin.
- **Tasks** — full CRUD nested under each project, with status (`todo` / `in_progress` / `done`), priority, due date, and assignee. Members can update only the status of tasks assigned to them; admins can do everything.
- **Dashboard** — counts by status, overdue tally, your open tasks, and overdue tasks across every project you're part of.
- **REST API** — all endpoints documented at `/docs` (Swagger UI) and `/redoc`.

## Role-based access (RBAC)

| Action                                  | Admin | Member |
| --------------------------------------- | :---: | :----: |
| View project & tasks                    |   ✓   |   ✓    |
| Create / edit / delete tasks            |   ✓   |   —    |
| Update **own** task status              |   ✓   |   ✓    |
| Add / remove / change-role of members   |   ✓   |   —    |
| Edit project, delete project (owner)    |   ✓   |   —    |

Project creators are automatically owners and admins. The owner cannot be removed or demoted.

## Repository layout

```
team-task-manager/
├── backend/          # FastAPI service
│   ├── app/
│   │   ├── main.py        # entrypoint, CORS, router includes, table create on startup
│   │   ├── config.py      # env-driven Settings via pydantic-settings
│   │   ├── database.py    # SQLAlchemy engine + session, Base
│   │   ├── models/        # User, Project, ProjectMembership, Task
│   │   ├── schemas/       # Pydantic request/response shapes
│   │   ├── core/          # security (JWT + bcrypt), shared deps
│   │   ├── routers/       # auth, users, projects, tasks, dashboard
│   │   └── seed.py        # `python -m app.seed` populates demo data
│   ├── requirements.txt
│   ├── Dockerfile
│   ├── railway.json
│   └── .env.example
├── frontend/         # Next.js App Router app
│   ├── app/
│   │   ├── layout.tsx
│   │   ├── page.tsx                # auth-aware redirect
│   │   ├── login/, signup/         # public auth pages
│   │   ├── dashboard/              # summary view
│   │   └── projects/, projects/[id]/  # project list + detail (members + tasks)
│   ├── components/   # Navbar, AuthGate, StatusBadge
│   ├── lib/          # api client (with refresh), auth context, types
│   ├── package.json
│   ├── Dockerfile
│   ├── railway.json
│   └── .env.example
├── DEPLOYMENT.md     # Railway step-by-step
├── demo-video.md     # 2-5 minute recording script
└── README.md
```

## Local development

### Prerequisites

- Python 3.11+
- Node.js 20+
- A running PostgreSQL 14+ (locally, or via Docker: `docker run --name ttm-pg -e POSTGRES_PASSWORD=postgres -p 5432:5432 -d postgres:16`)

### Backend

```bash
cd backend
python -m venv .venv && source .venv/bin/activate    # on Windows: .venv\Scripts\activate
pip install -r requirements.txt
cp .env.example .env                                 # then edit DATABASE_URL & JWT_SECRET_KEY
python -m app.seed                                   # optional: load demo users + tasks
uvicorn app.main:app --reload
```

API up at `http://localhost:8000`, interactive docs at `http://localhost:8000/docs`.

Demo accounts after seeding:
- `admin@example.com` / `password123` (admin of "Website Redesign")
- `member@example.com` / `password123` (member)

### Frontend

```bash
cd frontend
npm install
cp .env.example .env.local                           # NEXT_PUBLIC_API_URL=http://localhost:8000
npm run dev
```

Open `http://localhost:3000`.

## API overview

All routes are JSON; protected routes need `Authorization: Bearer <access_token>`.

| Method | Path                                            | Purpose                          |
| ------ | ----------------------------------------------- | -------------------------------- |
| POST   | `/api/auth/signup`                              | Create user, return token pair   |
| POST   | `/api/auth/login`                               | Issue token pair                 |
| POST   | `/api/auth/refresh`                             | Mint a new access token          |
| GET    | `/api/auth/me`                                  | Current user                     |
| GET    | `/api/users/search?q=…`                         | Search active users              |
| GET    | `/api/projects`                                 | Projects the user belongs to     |
| POST   | `/api/projects`                                 | Create a project (you become owner+admin) |
| GET    | `/api/projects/{id}`                            | Project detail w/ members & role |
| PATCH  | `/api/projects/{id}`                            | Update project (admin)           |
| DELETE | `/api/projects/{id}`                            | Delete project (owner only)      |
| GET    | `/api/projects/{id}/members`                    | List members                     |
| POST   | `/api/projects/{id}/members`                    | Add member by email (admin)      |
| PATCH  | `/api/projects/{id}/members/{uid}`              | Change role (admin)              |
| DELETE | `/api/projects/{id}/members/{uid}`              | Remove member (admin or self)    |
| GET    | `/api/projects/{id}/tasks?status=&assignee_id=` | List/filter tasks                |
| POST   | `/api/projects/{id}/tasks`                      | Create task (admin)              |
| GET    | `/api/projects/{id}/tasks/{tid}`                | Task detail                      |
| PATCH  | `/api/projects/{id}/tasks/{tid}`                | Update task                      |
| DELETE | `/api/projects/{id}/tasks/{tid}`                | Delete task (admin)              |
| GET    | `/api/dashboard`                                | Aggregated counts + lists        |

## Validation & relationships

- All inputs validated by Pydantic v2 (`min_length`, `max_length`, `EmailStr`, enums for status/priority/role).
- Database-level constraints: unique user emails, unique `(project_id, user_id)` membership, `ON DELETE CASCADE` from project → memberships/tasks, `ON DELETE SET NULL` for task creator/assignee.
- A task's `assignee_id` is checked at write time to ensure the user is a project member.
- The owner row in `project_memberships` is protected from deletion or demotion.

## Deployment

See `DEPLOYMENT.md` for the Railway step-by-step.

## Demo video

See `demo-video.md` for a 2-5 minute recording script that walks the rubric.
