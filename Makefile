API := apps/api
PY := .venv/bin/python
export PATH := /Applications/Postgres.app/Contents/Versions/latest/bin:$(PATH)

.PHONY: setup db migrate import structure-rules export-approved admin approve-all test web-setup web site-setup site watch watcher demo-check demo-backup db-dump db-restore gemini-models clean-text

setup:
	python3 -m venv $(API)/.venv && $(API)/.venv/bin/pip install -q -r $(API)/requirements.txt

db:
	createdb unclaimed 2>/dev/null || true
	createdb unclaimed_test 2>/dev/null || true

migrate:
	cd $(API) && .venv/bin/alembic upgrade head

import:
	cd $(API) && $(PY) -m unclaimed.import_candidates

# New pending versions with structured eligibility from data/eligibility_rules.json
structure-rules:
	cd $(API) && $(PY) -m unclaimed.structure_rules

# Snapshot of approved resources for golden and property tests. Re-run after approving.
export-approved:
	cd $(API) && $(PY) -m unclaimed.export_approved

# The back end (API + review tool) on :8000. Settings come from .env (see .env.example);
# ADMIN_PASSWORD=... on the command line still works and wins.
admin:
	cd $(API) && $(if $(ADMIN_PASSWORD),ADMIN_PASSWORD=$(ADMIN_PASSWORD)) $(if $(ADMIN_USER),ADMIN_USER=$(ADMIN_USER)) .venv/bin/uvicorn unclaimed.main:app --reload --port 8000

# Usage: make approve-all APPROVED_BY=manoj   (asks for one confirmation first)
approve-all:
	cd $(API) && $(PY) -m unclaimed.approve_all --by $${APPROVED_BY:-manoj}

test:
	cd $(API) && $(PY) -m pytest -q

web-setup:
	cd apps/web && npm install

# Version 1, the phone app, at http://localhost:3000 (needs the API from `make admin` running on :8000)
web:
	cd apps/web && npm run dev

site-setup:
	cd apps/site && npm install

# Version 2, the desktop website, at http://localhost:3001 (same API, same data; can run beside `make web`)
site:
	cd apps/site && npm run dev

# The Watcher, once (crawl, compare, extract with Claude if a key is set, follow-ups)
watch:
	cd $(API) && PYTHONPATH=..:. $(PY) -m worker.watcher once

# The Watcher on a nightly schedule (3:00 America/Los_Angeles)
watcher:
	cd $(API) && PYTHONPATH=..:. $(PY) -m worker.watcher daemon

# Demo readiness (CLAUDE.md "Demo mode"). Add ARGS=--offline to skip network checks.
demo-check:
	cd $(API) && $(PY) -m unclaimed.demo_check $(ARGS)

# Click-through backup reel of the full demo (needs `make admin` and `make web` running)
demo-backup:
	cd apps/web && npm run demo-backup

# Save the local database (approved data, history, no secrets) to data/db/unclaimed.sql
db-dump:
	mkdir -p data/db && pg_dump --no-owner --no-acl --clean --if-exists -d unclaimed -f data/db/unclaimed.sql

# Load data/db/unclaimed.sql into another database, e.g. a hosted one:
#   make db-restore TARGET_URL="postgres://user:pass@host:5432/dbname"
db-restore:
	@test -n "$(TARGET_URL)" || (echo 'Set TARGET_URL="postgres://..." (the database to load into)' && exit 1)
	psql "$(TARGET_URL)" -v ON_ERROR_STOP=1 -f data/db/unclaimed.sql

# List the Gemini models your GEMINI_API_KEY (from .env) can use; put one in GEMINI_MODEL
gemini-models:
	cd $(API) && $(PY) -c "import os, unclaimed; from google import genai; c = genai.Client(api_key=os.environ['GEMINI_API_KEY']); [print(m.name.removeprefix('models/')) for m in c.models.list() if 'generateContent' in (m.supported_actions or [])]"

# One-time: pending versions with reviewer notes removed from student-facing text (approve in /admin)
clean-text:
	cd $(API) && $(PY) -m unclaimed.clean_text
