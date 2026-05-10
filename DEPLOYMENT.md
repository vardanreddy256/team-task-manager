# Deploying to Railway

You'll create **three services** in one Railway project:

1. **PostgreSQL** (managed)
2. **Backend** (FastAPI)
3. **Frontend** (Next.js)

This guide assumes the repo is on GitHub and the directory layout matches `README.md`.

---

## 1. Push the repo to GitHub

```bash
cd team-task-manager
git init
git add .
git commit -m "Initial commit"
git branch -M main
git remote add origin git@github.com:<you>/team-task-manager.git
git push -u origin main
```

## 2. Create the Railway project

1. Sign in at <https://railway.app> → **New Project** → **Empty Project**.
2. Click **+ Create** → **Database** → **Add PostgreSQL**. Wait for it to provision.
3. Click on the Postgres service → **Variables** tab → copy `DATABASE_URL`. You'll reference it from the backend.

## 3. Deploy the backend

1. In the same Railway project, click **+ Create** → **GitHub Repo** → pick your repo.
2. After Railway detects it, open the new service → **Settings**:
   - **Root directory**: `backend`
   - **Builder**: Dockerfile (auto-detected from `backend/Dockerfile`)
3. Open the **Variables** tab and add:

   | Key                          | Value                                                       |
   | ---------------------------- | ----------------------------------------------------------- |
   | `DATABASE_URL`               | `${{Postgres.DATABASE_URL}}` (Railway reference syntax)     |
   | `JWT_SECRET_KEY`             | a long random string — generate with `openssl rand -hex 32` |
   | `JWT_ALGORITHM`              | `HS256`                                                     |
   | `ACCESS_TOKEN_EXPIRE_MINUTES`| `30`                                                        |
   | `REFRESH_TOKEN_EXPIRE_DAYS`  | `7`                                                         |
   | `CORS_ORIGINS`               | _placeholder; you'll fill in the frontend URL after step 4_ |
   | `ENVIRONMENT`                | `production`                                                |

4. Open **Settings → Networking** and click **Generate Domain**. Note the URL (e.g. `https://taskmanager-api-production.up.railway.app`).
5. Hit **Deploy**. The first build takes a few minutes. When healthy, visit `<url>/docs` — you should see the FastAPI Swagger page.

> The backend creates tables on startup via `Base.metadata.create_all`. No separate migration step needed for v1. (Alembic can be added later for schema evolution.)

### Optional: seed demo data

In the backend service, **Settings → Run Command** (or use Railway CLI: `railway run`):

```bash
python -m app.seed
```

This adds `admin@example.com` / `password123` and `member@example.com` / `password123`.

## 4. Deploy the frontend

1. In the same Railway project, **+ Create → GitHub Repo** → same repo again.
2. New service → **Settings**:
   - **Root directory**: `frontend`
   - **Builder**: Dockerfile
3. **Variables**:

   | Key                   | Value                                            |
   | --------------------- | ------------------------------------------------ |
   | `NEXT_PUBLIC_API_URL` | the backend URL from step 3 (no trailing slash)  |
   | `PORT`                | `3000` (Railway typically sets this for you)     |

   `NEXT_PUBLIC_*` values are baked in at **build time**. The frontend `Dockerfile` accepts it as a build-arg and exports it to the env before `npm run build` runs.

4. **Settings → Networking → Generate Domain**. Note the URL (e.g. `https://taskmanager.up.railway.app`).
5. **Trigger Redeploy** so the frontend builds with `NEXT_PUBLIC_API_URL` set.

## 5. Close the CORS loop

1. Go back to the backend service.
2. Set `CORS_ORIGINS` to the frontend URL (e.g. `https://taskmanager.up.railway.app`). Multiple origins can be comma-separated.
3. Redeploy.

## 6. Smoke test the live app

Open the frontend URL and:

1. Click **Create one** → sign up with a fresh email.
2. Land on the dashboard (zero everything).
3. Go to **Projects** → **New project** → create one.
4. Open the project → add a task → assign it to yourself.
5. Move the task to "in progress", then "done".
6. Add a second user (sign up in an incognito window with a different email) and invite them by email from the **Members** section. Try changing their role.
7. Confirm `/docs` on the backend domain still loads.

If everything works, you're done. Add the **frontend URL** and a demo-video link to the top of `README.md` and submit.

---

## Common issues

- **`relation "users" does not exist`**: the backend hasn't run `Base.metadata.create_all` yet. The lifespan handler runs it on startup; redeploy.
- **Frontend can't reach API (CORS)**: re-check `CORS_ORIGINS` exactly matches the frontend's HTTPS URL. The setting is read at startup, so redeploy after changing it.
- **`postgres://` vs `postgresql://`**: Railway sometimes hands out `postgres://`. The backend rewrites it on the fly in `database.py`.
- **bcrypt failing to install**: the backend `Dockerfile` already installs `gcc` and `libpq-dev`, which are enough on Debian-slim.
- **Frontend build complains about missing `NEXT_PUBLIC_API_URL`**: pass it through Railway's build-arg or set it as a service variable before the first build.
