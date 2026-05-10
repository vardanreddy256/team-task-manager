# Demo video script (2–5 minutes)

A walkthrough that hits every rubric item: auth, project + team, task CRUD, RBAC, dashboard, deployment.

Record at 1080p with a screen recorder (Loom, OBS, QuickTime, ScreenStudio). Speak from the script — short pauses are fine; you don't need to read it word-for-word.

**Total target: ~3 minutes.** Each section's time budget is in `[brackets]`.

---

## Open

> "Hi, I'm building a Team Task Manager — a full-stack app where teams create projects, assign tasks, and track progress, with role-based access control. Let me walk you through it."

`[10s]`

## 1 — Architecture (talk over the README) `[20s]`

Show `README.md` briefly:

> "Frontend is Next.js 14 with the App Router and Tailwind. Backend is FastAPI with SQLAlchemy on PostgreSQL. Auth uses JWT access and refresh tokens with bcrypt. Everything is deployed to Railway as three services."

## 2 — Auth `[20s]`

Open the live URL.

1. Click **Create one**.
2. Sign up as `alice@example.com` / `Password123!` / Alice Admin.
3. Land on the empty dashboard.

> "Signup hashes the password with bcrypt, returns a JWT pair, and stores them client-side. The dashboard is gated — without a valid token you'd be bounced back to login."

## 3 — Project & team management `[30s]`

1. Go to **Projects** → **New project** → name "Website Redesign", description "Q3 marketing refresh".
2. Open the project.
3. Show the **Members** section, with you listed as `(owner) admin`.
4. Add a member: enter `bob@example.com` and role `member`. (Open a second incognito window first and sign Bob up.)

> "Project creators automatically become the owner and an admin. Adding members is admin-only."

## 4 — Task CRUD + RBAC `[40s]`

1. Click **New task** → "Draft hero copy", priority `high`, due in 3 days, assignee Bob.
2. Show the task appearing in the **To do** column.
3. Drag the status dropdown to **In progress**.
4. Edit the task → change description.
5. Switch to the incognito window, sign in as Bob.
6. Open the same project as Bob:
   - **New task** button is hidden (member can't create).
   - Bob can change the status of his assigned task to **Done**.
   - Try editing the title — it returns 403 "Members can only update the status field" (show the toast or console).

> "RBAC is enforced both in the UI and at the API. Members can only touch the status of their own tasks; admins can do everything."

## 5 — Overdue + dashboard `[30s]`

Back as Alice:

1. Create a second task with a due date set in the past, assigned to Alice.
2. Go to **Dashboard**. Show:
   - Total tasks count.
   - Status counts (todo / in progress / done).
   - **Overdue** card highlighted in red.
   - "My open tasks" list.
   - "Overdue" list with the past-dated task.

> "The dashboard is a single aggregated query — counts by status, overdue tally, your open tasks, and overdue items across every project you're part of."

## 6 — Validation & relationships `[20s]`

Switch to a terminal or `<backend-url>/docs`:

1. Try `POST /api/auth/signup` with a 4-char password → 422 with the Pydantic error.
2. Try `POST /api/projects/{id}/tasks` assigning a user who isn't a member → 400 "Assignee must be a member of the project".

> "Pydantic enforces input validation. Database-level constraints handle the rest — unique emails, unique memberships, cascading deletes."

## Close `[10s]`

> "That's the full app — auth, projects, team management, task CRUD with RBAC, dashboard, and validations. Deployed on Railway with PostgreSQL. Source is on GitHub. Thanks for watching."

---

## Recording checklist

- [ ] Browser zoomed to 110-125% so text is readable.
- [ ] Hide bookmarks bar / personal tabs.
- [ ] Use a fresh signup so you don't show real user data.
- [ ] Mic test before recording.
- [ ] Trim the dead time at start/end before uploading.
- [ ] Upload to YouTube (Unlisted) or Loom; paste the link into `README.md` and your submission form.
