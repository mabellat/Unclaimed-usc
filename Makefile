API := apps/api
PY := .venv/bin/python
export PATH := /Applications/Postgres.app/Contents/Versions/latest/bin:$(PATH)

.PHONY: setup db migrate import structure-rules export-approved admin approve-all test web-setup web watch watcher demo-check demo-backup

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

# Usage: make admin ADMIN_PASSWORD=choose-one   (ADMIN_USER defaults to manoj)
admin:
	@test -n "$(ADMIN_PASSWORD)" || (echo "Set ADMIN_PASSWORD, e.g. make admin ADMIN_PASSWORD=..." && exit 1)
	cd $(API) && ADMIN_USER=$${ADMIN_USER:-manoj} ADMIN_PASSWORD=$(ADMIN_PASSWORD) .venv/bin/uvicorn unclaimed.main:app --reload --port 8000

# Usage: make approve-all APPROVED_BY=manoj   (asks for one confirmation first)
approve-all:
	cd $(API) && $(PY) -m unclaimed.approve_all --by $${APPROVED_BY:-manoj}

test:
	cd $(API) && $(PY) -m pytest -q

web-setup:
	cd apps/web && npm install

# The student app at http://localhost:3000 (needs the API from `make admin` running on :8000)
web:
	cd apps/web && npm run dev

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
