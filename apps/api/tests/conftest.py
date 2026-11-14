import os

os.environ["DATABASE_URL"] = os.environ.get("TEST_DATABASE_URL", "postgresql+psycopg://localhost/unclaimed_test")
os.environ["ADMIN_USER"] = "owner"
os.environ["ADMIN_PASSWORD"] = "test-password"

from pathlib import Path  # noqa: E402
import sys  # noqa: E402

sys.path.insert(0, str(Path(__file__).resolve().parents[2]))  # apps/, for the worker package

import pytest  # noqa: E402

import httpx  # noqa: E402


@pytest.fixture(autouse=True)
def no_network(monkeypatch):
    """Tests never fetch real pages; agent tests pass a fake fetcher."""
    def refuse(*a, **k):
        raise AssertionError("a test tried to use the network")
    monkeypatch.setattr(httpx.Client, "get", refuse)
from alembic import command  # noqa: E402
from alembic.config import Config  # noqa: E402
from sqlalchemy import text  # noqa: E402
from sqlalchemy.engine import make_url  # noqa: E402

from unclaimed.db import SessionLocal, engine  # noqa: E402
from unclaimed.models import Resource  # noqa: E402

API_DIR = Path(__file__).resolve().parents[1]


@pytest.fixture(scope="session", autouse=True)
def migrated():
    if not (make_url(os.environ["DATABASE_URL"]).database or "").endswith("_test"):
        raise RuntimeError("Tests reset their schema. TEST_DATABASE_URL must name a dedicated database ending in _test.")
    cfg = Config(API_DIR / "alembic.ini")
    cfg.set_main_option("script_location", str(API_DIR / "migrations"))
    command.downgrade(cfg, "base")
    command.upgrade(cfg, "head")


@pytest.fixture
def session():
    with engine.begin() as conn:
        conn.execute(text("TRUNCATE resources, students, student_facts, claims, review_log, agent_runs, source_checks, page_snapshots, watcher_runs, resource_changes"))
    with SessionLocal() as s:
        yield s


def make_pending(session, rid="gsg-travel-award", version=1, **overrides) -> Resource:
    fields = dict(
        id=rid, version=version, status="pending", title="GSG Travel Award", category="cash",
        relevance=["conference"], benefit_label="$500 per student per academic year", benefit_value=500,
        source_url="https://engage.usc.edu/Gsg/gsg-ta/", evidence_quote="$500 per student per academic year",
    ) | overrides
    r = Resource(**fields)
    session.add(r)
    session.commit()
    return r
