# Unclaimed runbook: run it, test it, configure it, host it

Last checked 2026-11-14 against commit `16ea99d` plus the `db-dump`/`db-restore` targets. Every command runs from the repo root unless it says otherwise.

## 0. What runs where

| Part | Where it runs locally | What it is |
|---|---|---|
| PostgreSQL | Postgres.app, port 5432, database `unclaimed` (tests use `unclaimed_test`) | All data: approved records, student cards, claims, agent logs |
| API | http://localhost:8000 | FastAPI. Also serves the review tool at `/admin` and auto API docs at `/docs` |
| Phone app (version 1) | http://localhost:3000 | Next.js student app in a phone-sized frame (`apps/web`). Talks only to the API |
| Website (version 2) | http://localhost:3001 | The same app laid out for a laptop or projector (`apps/site`). Same API, same data, same components |
| Watcher (optional) | runs in a terminal when you start it | Nightly page re-check (`make watch` once, `make watcher` on a schedule) |

Both front ends need the API, and the API needs Postgres. Start them in that order. Run one front end or both side by side.

---

## 1. First-time setup on a new machine

Your Mac is already set up. Use this section for a teammate's laptop, or if you ever start fresh.

**Install:**
- [Postgres.app](https://postgresapp.com) (open it and click Initialize). The Makefile expects its tools at `/Applications/Postgres.app/Contents/Versions/latest/bin`.
- Python 3.12 or newer (built and tested on 3.14.7).
- Node.js 20 or newer (built and tested on 26.9.0).
- Google Chrome (only for `make demo-backup`).

**Then:**
```bash
git clone https://github.com/mabellat/Unclaimed-usc.git unclaimed && cd unclaimed
make setup        # Python virtualenv + API packages (apps/api/.venv)
make web-setup    # phone app packages (apps/web/node_modules)
make site-setup   # website packages (apps/site/node_modules)
make db           # creates the unclaimed and unclaimed_test databases
make db-restore TARGET_URL="postgres://localhost/unclaimed"   # loads your approved data from data/db/unclaimed.sql
make test         # should end with "192 passed"
```

`db-restore` loads the full schema and data, so you don't need `make migrate`, `make import` or approvals. Create `apps/web/.env.local` and `apps/site/.env.local`, each with this one line (they're git-ignored):
```
NEXT_PUBLIC_API_URL=http://localhost:8000
```

---

## 2. Start the app (every time)

Open two terminal tabs in the repo folder (three if you want both versions at once).

**Tab 1, the API** (reads your settings from `.env`, section 3):
```bash
make admin
```

**Tab 2, pick a version (or open a third tab and run both):**
```bash
make web     # version 1, the phone app      -> http://localhost:3000
make site    # version 2, the desktop website -> http://localhost:3001
```
The first time on a machine, run `make site-setup` before `make site`.

Which one to demo: the website for a laptop or projector, the phone app for a phone (or a narrow browser window). They share one API and one database, but each one remembers its own card, so load the demo student in the one you're showing. Results are identical.

**Open:**
- Phone app: http://localhost:3000
- Website: http://localhost:3001
- Review tool: http://localhost:8000/admin (the `ADMIN_USER` and `ADMIN_PASSWORD` from `.env`)
- API docs (handy for poking endpoints): http://localhost:8000/docs

**Quick health check:**
```bash
curl -s localhost:8000/resources | python3 -c "import json,sys; d=json.load(sys.stdin); print(len(d['resources']), 'approved, data version', d['data_version'])"
curl -s localhost:8000/agents/status     # "llm": true once your AI key is set
```
Expected: `45 approved`.

**Stop:** Ctrl+C in each tab.

---

## 3. Settings: the `.env` file (AI key, model, admin password)

All settings live in one file, **`.env`** at the repo root. It's git-ignored, so your key is never committed. `.env.example` (committed) shows every setting. The back end, the Watcher and the scripts load `.env` on start; anything you `export` in a terminal overrides it.

1. If `.env` doesn't exist yet: `cp .env.example .env`.
2. Open `.env` and fill in:
   ```
   GEMINI_API_KEY=your-key            # from https://aistudio.google.com/apikey
   GEMINI_MODEL=                      # see step 3
   ADMIN_USER=manoj
   ADMIN_PASSWORD=pick-a-password
   ```
3. Find a model name your key can use:
   ```bash
   make gemini-models
   ```
   It prints names like `gemini-...-flash`. Copy one (a Flash model is fast and cheap) into `GEMINI_MODEL=`.
4. Restart the back end (Ctrl+C in Tab 1, then `make admin`). Changes to `.env` are read on start.
5. Check: open http://localhost:8000/agents/status. You want `"llm": true` and `"name": "Gemini"`. If `"llm"` is false, the `"problem"` line says exactly what's missing (for example `GEMINI_MODEL is not set`).

The code contains no model name. Without both a key and a model the AI stays off, and the app uses its labelled template answers.

**Claude instead:** set `ANTHROPIC_API_KEY` and `ANTHROPIC_MODEL` in `.env`. If both providers are configured, Gemini is used unless you set `UNCLAIMED_LLM_PROVIDER=anthropic`.

**Other optional settings:**

| Setting | Effect |
|---|---|
| `UNCLAIMED_MODEL=...` | Override the model for whichever provider is active |
| `UNCLAIMED_LLM_PROVIDER=gemini` or `anthropic` | Choose when both are configured |
| `UNCLAIMED_LLM=off` | Force the no-AI paths even with a key set |

---

## 4. Test it

### 4a. Automated (about 1 minute)
```bash
make test          # 192 tests: matching, approvals, agents, Watcher. Never touches the network
make demo-check    # demo readiness: should say READY (needs internet; add ARGS=--offline to skip network checks)
```
Expected `demo-check` warnings until you act on them: template drafts (fixed by step 3) and no screen recording yet.

### 4b. Manual walkthrough (about 10 minutes)
Start the app (section 2), open http://localhost:3000 in Chrome, and turn on the device toolbar (Cmd+Shift+M, iPhone 14 Pro) to see it at phone size.

| # | Do | You should see |
|---|---|---|
| 1 | Welcome, then **Skip: load a demo student**, then **Priya** | The scan screen, then her wallet |
| 2 | Look at the top of the wallet | **$11,250**, "15 things you qualify for, 6 more to confirm", PURF pill **"Due Nov 19 · N days left"** in red |
| 3 | Gold card: "Do you have a Dornsife faculty member...?", tap **Yes** | **$15,250**, 17 things, 4 to confirm; SOAR and SURF move up |
| 4 | Open the **PURF** ticket | "Why you qualify" with 4 ticks and "You told us" lines; source link |
| 5 | **Claim it for me** | Live trace: 6 steps with tool chips; a badge naming the model (e.g. GEMINI) or TEMPLATE |
| 6 | Packet: tap **"All 7 statements checked..."** | Each sentence labelled SOURCE PAGE or YOUR CARD; "Add deadline to calendar" downloads a `.ics` file |
| 7 | **I sent it**, then Claims: **Day 7**, then **Day 30** | Sent, then In review, then Received with the semester recap (labelled simulated) |
| 8 | Alerts tab | Welcome, PURF came through, new term (simulated ones say so) |
| 9 | Ask tab: "Why can't I get the GSG Emergency Fund?" | "...It is for master's students and PhD and other graduate students, and your card says Undergraduate..." |
| 10 | Ask: "write me a poem" | "I can only help with USC funds, scholarships and services in Unclaimed..." |
| 11 | My card: **Delete my card and restart**, then load **Wei**; open **CSI Emergency Loan**, answer **No** | Maybe, then "Why it doesn't fit right now: It needs a U.S.-issued Social Security number. The office may know of other options..." |
| 12 | http://localhost:8000/admin | 45 approved; open a record to see it beside its source quote |

With an AI key set, steps 5 to 10 show the model's wording instead of the templates (the trace badge names the model, e.g. GEMINI). Check the tone of the "why not" answers.

### 4c. The Watcher
```bash
make watch    # crawls all 44 pages (about 30 seconds) and prints a summary
```
Then open http://localhost:8000/admin/source-checks for anything flagged. Three records are already flagged from the first run (see `docs/step6-summary.md`).

### 4d. Clean up test cards
Demo cards are real rows. Delete one from My card ("Delete my card and restart"), or remove them all:
```bash
/Applications/Postgres.app/Contents/Versions/latest/bin/psql -d unclaimed -c "delete from students"
```
Claims, answers and agent logs for those cards are deleted with them. Approved data is untouched.

### 4e. Refresh the backup reel (after any copy or data change)
With the app running: `make demo-backup` writes `docs/demo/backup/index.html` (17 screenshots).

---

## 5. All settings

### API (FastAPI): environment variables

| Variable | Needed? | Local value | Hosted value | Notes |
|---|---|---|---|---|
| `DATABASE_URL` | Hosted: yes | defaults to `postgresql+psycopg://localhost/unclaimed` | your host's Postgres URL | `postgres://` and `postgresql://` are converted automatically |
| `ADMIN_USER` | For /admin | `manoj` (set by `make admin`) | `manoj` | The name stamped on approvals |
| `ADMIN_PASSWORD` | For /admin | anything | a long random password | Without it /admin answers 503 |
| `WEB_ORIGINS` | Hosted: yes | defaults to `http://localhost:3000,http://localhost:3001` | your web URL, e.g. `https://unclaimed.vercel.app` | Comma-separated if several. No trailing slash |
| `GEMINI_API_KEY` | Optional | your key | your key | Turns on Gemini (preferred if both keys are set) |
| `GEMINI_MODEL` | With a Gemini key | from `make gemini-models` | same | No default: required for Gemini |
| `ANTHROPIC_API_KEY` + `ANTHROPIC_MODEL` | Optional | | | Turn on Claude instead (both needed) |
| `UNCLAIMED_LLM_PROVIDER` | Optional | | | `gemini` or `anthropic` when both keys are set |
| `UNCLAIMED_MODEL` | Optional | | | Overrides the model for the active provider |
| `UNCLAIMED_LLM` | Optional | | | `off` forces the no-AI paths |
| `TEST_DATABASE_URL` | Tests only | defaults to `.../unclaimed_test` | | |

### Web (Next.js)

| Variable | Local | Hosted | Notes |
|---|---|---|---|
| `NEXT_PUBLIC_API_URL` | `http://localhost:8000` (in `apps/web/.env.local`) | your API URL, e.g. `https://unclaimed-api.onrender.com` | Baked in at build time: redeploy the web app after changing it |
| `NEXT_PUBLIC_HERO_PHOTO` | Optional, website only (`apps/site/.env.local`) | same | A campus photo behind the website's hero, e.g. `/campus/hero.jpg` placed in `apps/site/public/campus/`. Shown tinted cardinal. Use only a photo you took or have the rights to (not images copied from usc.edu). Restart `make site` after setting it |

### Watcher (worker)
Needs `DATABASE_URL`, plus `GEMINI_API_KEY` and `GEMINI_MODEL` if you want page extraction. It needs outbound HTTPS to usc.edu and uscimmigrationclinic.org.

---

## 6. Hosting (Render for API, database and Watcher; Vercel for the web app)

Any host works. These steps use Render and Vercel because both deploy straight from GitHub. Two rules matter wherever you host:
- **Deploy the API from the repo root, not `apps/api`.** The API reads `data/` at the repo root (rules, profile questions, personas).
- **Build from the `main` branch.**

### 6.1 Database (Render PostgreSQL)
1. Render dashboard, then **New, PostgreSQL**. Pick a name and region (for example Oregon, near LA). Create it.
2. Copy its **External Database URL**.
3. Load your approved data from your Mac:
   ```bash
   make db-dump                                             # refresh data/db/unclaimed.sql from your local DB
   make db-restore TARGET_URL="<External Database URL>"
   ```
   Warning: `db-restore` replaces everything in the target database, including any student cards there.

### 6.2 API (Render Web Service)
1. **New, Web Service**, connect the GitHub repo `mabellat/Unclaimed-usc`, branch `main`, same region as the database.
2. Settings:
   - **Root Directory:** leave blank (the repo root)
   - **Runtime:** Python
   - **Build Command:** `pip install -r apps/api/requirements.txt`
   - **Start Command:** `cd apps/api && alembic upgrade head && uvicorn unclaimed.main:app --host 0.0.0.0 --port $PORT`
3. Environment variables: `DATABASE_URL` (the database's **Internal** URL), `ADMIN_USER`, `ADMIN_PASSWORD`, `GEMINI_API_KEY`, `GEMINI_MODEL`, `WEB_ORIGINS` (fill this in after 6.3), and `PYTHON_VERSION` = the version you run locally (`python3 --version`; this app is tested on 3.14.7, so use the newest version Render offers if 3.14 isn't available).
4. Deploy, then check: `https://<your-api>.onrender.com/resources` lists 45 resources, and `/agents/status` shows `"llm": true` and `"name": "Gemini"`.

### 6.3 Web app (Vercel)
1. https://vercel.com, **Add New, Project**, import `mabellat/Unclaimed-usc`.
2. **Root Directory:** `apps/web`. The framework (Next.js) is detected automatically.
3. Environment variable: `NEXT_PUBLIC_API_URL` = `https://<your-api>.onrender.com` (no trailing slash).
4. Deploy, and copy the site URL (for example `https://unclaimed-usc.vercel.app`).
5. For the website too, add a second Vercel project from the same repo with **Root Directory** `apps/site` and the same `NEXT_PUBLIC_API_URL`. Leave "Include files outside the root directory" on: the website reads shared code from `apps/web/src` through the `apps/site/src/shared` link.
6. Back on Render, set `WEB_ORIGINS` to the site URL(s), comma-separated, and redeploy the API. Without it the browser blocks API calls (a CORS error in the console).

### 6.4 Watcher (optional)
Either:
- **Render Background Worker:** same repo and build command, Start Command `cd apps/api && PYTHONPATH=..:. python -m worker.watcher daemon` (runs nightly at 3:00 a.m. Pacific), env `DATABASE_URL`, `GEMINI_API_KEY` and `GEMINI_MODEL`; or
- **Render Cron Job:** schedule `0 11 * * *` (11:00 UTC, 3:00 a.m. Pacific standard time), command `cd apps/api && PYTHONPATH=..:. python -m worker.watcher once`.

### 6.5 After deploying
- Walk through section 4b on the hosted URL, on your phone.
- Free tiers may sleep when idle, so the first request after a while can take up to a minute. Open the site a few minutes before presenting. Check each provider's free-tier limits for the database's lifetime.

### 6.6 Before sharing the link publicly
- **The review tool (`/admin`) uses basic auth with no protection against forged form posts.** Use a long random `ADMIN_PASSWORD`, don't share the admin URL, and ideally do reviews on your Mac, then `db-dump` and `db-restore`. Note that a restore also replaces hosted student cards.
- Keep keys only in host settings and your shell. `.env` and `.env*.local` are git-ignored.
- Keep `WEB_ORIGINS` to your real web URL(s).

---

## 7. Demo day
- **Run it on your laptop** (section 2), not the hosted copy. Venue Wi-Fi then only affects the AI model and the page re-check, and both fall back automatically.
- Morning of the demo: `make demo-check` must say READY. Keep `docs/demo/backup/index.html` open in a second tab.
- The click path, timings and fallbacks are in `docs/demo/rehearsal.md`.
- Dates: Town and Gown closes **November 15, 2026** and PURF **November 19, 2026**. After that their tickets show Closed. Use Marcus / Cavaney or Sofia / Trojan Food Pantry for the claim demo instead.

---

## 8. When something goes wrong

| Symptom | Likely cause | Fix |
|---|---|---|
| Web app says "Can't reach the Unclaimed API" | API not running, or the wrong `NEXT_PUBLIC_API_URL` | Start `make admin`; check `apps/web/.env.local` (hosted: Vercel env, then redeploy) |
| Browser console shows a CORS error | `WEB_ORIGINS` doesn't list the web URL | Set it exactly (scheme + host, no trailing slash), then restart or redeploy the API |
| `/admin` returns 503 | `ADMIN_USER` / `ADMIN_PASSWORD` not set | Use `make admin ADMIN_PASSWORD=...` (hosted: set both) |
| `make test` can't connect | Postgres.app not running, or the test DB is missing | Open Postgres.app; run `make db` |
| Claim trace says TEMPLATE although you set a key | Key exported in a different terminal tab | Export it in the API tab and restart; check `/agents/status` |
| Trace says the AI was unavailable and fell back to the template | Bad key, unknown model ID, quota, or the model rejected the JSON schema | The trace note shows the error. Check the key and `GEMINI_MODEL`; the app keeps working on the template meanwhile |
| `make demo-check`: "test snapshot is current" FAIL | You approved a change since the last snapshot | `make export-approved`, then `make test` |
| `make demo-check`: persona results FAIL | Approved data changed what a persona gets | Update `data/demo_personas.json` expectations, or revisit the change |
| Web build fails inside `next/font` | Couldn't fetch Google Fonts (network blip) | Run the build again |
| "Address already in use" on 8000 or 3000 | An old server is still running | `lsof -i :8000` (or `:3000`), then `kill <PID>` |
| Hosted API starts but every page is empty | Data wasn't restored to the hosted database | Section 6.1, step 3 |
