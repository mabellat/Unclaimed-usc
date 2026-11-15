# Deploying Unclaimed live

Render runs the API and the database. Vercel runs the website. About 20 minutes. Tick each box as you go.

## What you'll end up with

| Piece | Where | Address |
|---|---|---|
| Database (Postgres) | Render | internal only |
| API + review tool | Render Web Service | `https://<api>.onrender.com` |
| Website (and the tour) | Vercel, root `apps/site` | `https://<site>.vercel.app` (tour at `/tour`) |
| Phone app (optional) | Vercel, root `apps/web` | `https://<app>.vercel.app` |

Before you start, you need accounts on **github.com**, **render.com** and **vercel.com** (sign in to both with GitHub), plus your Gemini key and model name from `.env`.

## Step 0. Put the code on GitHub main

Render and Vercel build from `mabellat/Unclaimed-usc`, branch `main`. Your latest work (including `/tour`) is uncommitted on `feat/minimalist-ui-theme`.

```bash
git add -A
git commit -m "Website, tour and UI updates"
git push -u origin feat/minimalist-ui-theme
# then open a pull request on GitHub and merge it into main
```

- [ ] Everything is merged into **main** on GitHub.
- [ ] `git status` does not list `.env` or `.env.local` (they are git-ignored; keys must never be pushed).

## Step 1. Database (Render PostgreSQL)

- [ ] Render dashboard: **New**, then **PostgreSQL**. Name it `unclaimed`, region **Oregon**. Create it.
- [ ] Copy its **External Database URL** (for your Mac) and its **Internal Database URL** (for step 2).
- [ ] From the repo folder on your Mac, load your approved data:

```bash
make db-dump
make db-restore TARGET_URL="<External Database URL>"
```

> **Heads up:** `db-restore` replaces everything in the target database, including any student cards already there.

## Step 2. API (Render Web Service)

- [ ] **New**, then **Web Service**. Connect `mabellat/Unclaimed-usc`, branch **main**, region **Oregon**.
- [ ] **Root Directory:** leave it blank (the API reads `data/` at the repo root).
- [ ] **Runtime:** Python.
- [ ] **Build Command:**

```
pip install -r apps/api/requirements.txt
```

- [ ] **Start Command:**

```
cd apps/api && alembic upgrade head && uvicorn unclaimed.main:app --host 0.0.0.0 --port $PORT
```

- [ ] Add the environment variables below, then click **Deploy**.

| Variable | Value |
|---|---|
| `DATABASE_URL` | The **Internal** Database URL from step 1 |
| `ADMIN_USER` | `manoj` |
| `ADMIN_PASSWORD` | A long random password (not the one on your Mac) |
| `GEMINI_API_KEY` | Your key |
| `GEMINI_MODEL` | Same model name as in your `.env` |
| `PYTHON_VERSION` | Your local version (run `python3 --version`); the newest Render offers if it doesn't have yours |
| `WEB_ORIGINS` | Leave empty for now; you fill it in at step 4 |

**Check it works:**

- [ ] `https://<api>.onrender.com/resources` lists your resources.
- [ ] `https://<api>.onrender.com/agents/status` shows `"llm": true`.

## Step 3. Website (Vercel)

- [ ] vercel.com: **Add New**, then **Project**. Import `mabellat/Unclaimed-usc`.
- [ ] **Root Directory:** `apps/site`. Framework: Next.js (detected automatically).
- [ ] Keep **"Include files outside the root directory"** turned **on**. The site reads shared code from `apps/web/src` through a link.
- [ ] Environment variable: `NEXT_PUBLIC_API_URL` = `https://<api>.onrender.com` (no trailing slash).
- [ ] Click **Deploy** and copy the site URL, e.g. `https://unclaimed-usc.vercel.app`.

Optional, the phone app: repeat this step with Root Directory `apps/web` and the same variable.

## Step 4. Connect the two

- [ ] On Render, open the API, then **Environment**. Set `WEB_ORIGINS` to your Vercel URL, exactly, no trailing slash. Several URLs? Separate them with commas:

```
WEB_ORIGINS=https://unclaimed-usc.vercel.app,https://unclaimed-app.vercel.app
```

- [ ] Save and let the API redeploy.
- [ ] Open the website, build a card, and check the wallet fills in.
- [ ] Open `/tour` and watch it play through.

## If something goes wrong

| You see | Fix |
|---|---|
| "Can't reach the Unclaimed API" | Check `NEXT_PUBLIC_API_URL` on Vercel, then **redeploy** the site (the value is baked in at build time). |
| CORS error in the browser console | `WEB_ORIGINS` must match the site URL exactly (https, no trailing slash). Redeploy the API. |
| API runs but every page is empty | The data wasn't loaded. Redo step 1, `db-restore`. |
| `/agents/status` says `"llm": false` | The `"problem"` line names what's missing; usually `GEMINI_MODEL`. |
| `/admin` answers 503 | Set both `ADMIN_USER` and `ADMIN_PASSWORD` on Render. |
| First load takes up to a minute | Normal on the free tier: it sleeps when idle. Open the site a few minutes before presenting. |
| Vercel build fails inside `next/font` | A network blip fetching Google Fonts. Redeploy. |

## Good to know

- **Updating later:** push to main. Render and Vercel rebuild by themselves.
- **Approving new data:** approve on your Mac in `/admin`, then run `make db-dump` and `make db-restore` again. This also wipes hosted student cards.
- **Keep /admin private:** don't share the admin URL; use a long random password.
- **Demo day:** present from your laptop (`make admin` and `make site`), and keep the hosted link as a backup and for sharing.
- **The Watcher** (nightly page checks) is optional. See `docs/runbook.md`, section 6.4.
- Full details: `docs/runbook.md`, sections 5 and 6.
