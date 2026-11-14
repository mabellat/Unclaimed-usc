# Unclaimed

Find USC funds, scholarships and support services, understand why they match, and prepare an application. Students review and send their own materials. This is a demo using public source data, not an official USC service.

## Run the whole app

Requirements: macOS or Linux, Python 3.11+, Node.js 20.9+ with npm, and PostgreSQL 16+ **server tools** (`initdb`, `pg_ctl`, `psql`, `createdb`). PostgreSQL does not need to be running. If the tools aren't discovered automatically, set `PG_BIN` to their bin directory.

From the repository root:

```sh
python3 scripts/app.py setup   # Install Python and frontend dependencies once
python3 scripts/app.py run     # Start PostgreSQL + API + frontend + nightly worker
```

Equivalent Make targets: `make app-setup`, then `make app`.

- App: <http://localhost:3000>
- API documentation: <http://localhost:8000/docs>
- Owner review: <http://localhost:8000/admin>
- Default admin user: `owner`. A random password is saved in `.local/admin-password`, or you can supply `ADMIN_USER` and `ADMIN_PASSWORD` in your environment.

The launcher creates a private, password-protected PostgreSQL cluster on loopback port 55432 under `.local/postgres`, applies migrations, and restores `data/approved_resources.json` **only into an empty catalog**. It preserves the original human approval stamps and data versions. It never approves pending candidates or replaces existing records. Local data and credentials remain in the ignored `.local/` directory between runs.

Press **Ctrl+C** to stop every managed service. Logs are in `.local/logs/`; database logs are in `.local/postgres.log`. Startup fails clearly if a port is already in use or a service exits. The launcher manages its own database and ignores external `DATABASE_URL`/`TEST_DATABASE_URL` values; the original Make targets remain available for externally managed databases.

For different ports:

```sh
python3 scripts/app.py run --web-port 3100 --api-port 8100 --db-port 55433
```

The frontend API URL and CORS origins follow these options. The worker schedules source checks for 3:00 AM America/Los_Angeles; it does not crawl immediately on startup. Use `--no-worker` to omit it.

Without Anthropic credentials, the Navigator and drafting use their labelled template paths. For a repeatable demo without live claim-page requests, set `UNCLAIMED_DEMO_REPLAY=1` before starting; supported demo claims replay the labelled cached runs. Other claims still use the normal agent. Environment variables must be exported in your shell; the launcher does not source `.env` files.

## Test the whole app

Install Google Chrome or Chromium, then run:

```sh
python3 scripts/app.py test
# Equivalent:
make test-all
```

Set `CHROME_PATH` if your browser isn't at `/usr/bin/google-chrome`, for example on macOS:

```sh
CHROME_PATH='/Applications/Google Chrome.app/Contents/MacOS/Google Chrome' python3 scripts/app.py test
```

Stop `app.py run` first; the launcher locks concurrent commands because frontend builds share a directory. If another app already uses the default ports, pass the same port options shown above.

The test command:

1. Creates a disposable PostgreSQL cluster, separate from your persistent local app data.
2. Runs the complete pytest suite: database constraints/migrations, approval, import, eligibility, cards, agents, watcher and snapshot restoration.
3. Runs TypeScript checks and a production frontend build.
4. Starts the real API, production frontend and worker, and checks offline demo readiness.
5. Runs browser UX tests with controlled failure responses, then end-to-end tests against the **real API and database**: all demo persona matches, admin authentication, wallet questions/search, claim streaming/packet/citations/checklist/calendar, claims timeline, alerts, Navigator, profile editing/deletion, and responsive tab layouts.
6. Stops its services and removes its disposable database, including on failure.

Test logs and failure screenshots are in `.local/test-logs/`; UX screenshots are in `/tmp/unclaimed-ux` by default. Tests force `UNCLAIMED_LLM=off` and use labelled cached replay for browser claim flows. API/worker tests exercise the actual agent graphs and source-change handling with fake external responses. Live USC source availability and paid Claude calls are **not** part of this repeatable suite. The production build may download Google Fonts.

Offline demo readiness may warn that cached drafts use templates and that the backup contains screenshots instead of a video; those warnings are distinct from test failures.

For architecture, matching rules and the original design specification, see [CLAUDE.md](CLAUDE.md). For the frontend changes, see [docs/frontend-ux.md](docs/frontend-ux.md).
