"""The Watcher: crawl, compare, extract, diff, follow-ups, and approved-only alerts."""

from datetime import datetime, timedelta, timezone

import pytest
from fastapi.testclient import TestClient

from tests.conftest import make_pending
from unclaimed import repo, review
from unclaimed.agents.llm import LLMError
from unclaimed.allowlist import is_allowed
from unclaimed.main import app
from unclaimed.models import Claim, PageSnapshot, ResourceChange, SourceCheck, Student, StudentFact
from worker import crawl as crawl_mod
from worker import diff as diff_mod
from worker import extract as extract_mod
from worker import watcher

client = TestClient(app)
URL = "https://engage.usc.edu/Gsg/gsg-ta/"
URL2 = "https://gsg.usc.edu/student-resources/"
GRAD = {"kind": "rule", "field": "level", "op": "in", "value": ["masters", "phd_or_other_grad"], "text": "graduate student"}
FILLER = "<p>Graduate students can apply for travel support through EngageSC before the trip.</p>" * 10


def page(amount="$500", deadline="Apply before you travel"):
    return f"<html><body><h1>GSG Travel Award</h1><p>{amount} per student per academic year</p><p>{deadline}</p>{FILLER}</body></html>"


class Pages:
    def __init__(self, pages):
        self.pages = pages

    def __call__(self, url):
        if url not in self.pages:
            return 404, ""
        return 200, self.pages[url]


@pytest.fixture
def world(session, monkeypatch):
    monkeypatch.setattr(crawl_mod, "sources", lambda: [{"url": URL, "resource_ids": ["gsg-travel-award"]},
                                                       {"url": URL2, "resource_ids": ["gsg-travel-award"]}])
    make_pending(session, eligibility=[GRAD], source_url=URL, deadline_label="Apply before you travel")
    review.approve(session, "gsg-travel-award", 1, approved_by="manoj")
    return session


def cand(amount=500, label="$500 per student per academic year", deadline="Apply before you travel"):
    return {"benefit_label": {"value": label, "quote": label},
            "benefit_value": {"value": amount, "quote": label},
            "benefit_period": {"value": None, "quote": None},
            "deadline_label": {"value": deadline, "quote": deadline},
            "academic_year": {"value": None, "quote": None}, "where": {"value": None, "quote": None},
            "note": {"value": None, "quote": None}, "steps": [], "docs": [], "eligibility": []}


class FakeLLM:
    model = "fake"

    def __init__(self, by_url):
        self.by_url, self.calls = by_url, 0

    def json(self, system, user, schema, effort="medium"):
        self.calls += 1
        for url, c in self.by_url.items():
            if url in user:
                if isinstance(c, Exception):
                    raise c
                return c
        raise AssertionError("unexpected page")


def test_every_source_is_on_the_allowlist():
    for s in crawl_mod.sources():
        assert is_allowed(s["url"]), s["url"]


def test_first_crawl_stores_snapshots_and_creates_nothing(world):
    out = watcher.run(world, None, Pages({URL: page(), URL2: page()}))
    assert out["pages"] == 2 and out["pages_changed"] == 0
    assert world.query(PageSnapshot).count() == 2
    assert world.query(SourceCheck).count() == 0  # the approved quote is on the page
    assert len(repo.list_approved(world)) == 1 and review.counts(world).get("pending", 0) == 0


def test_changed_page_without_llm_is_flagged_once_never_changed(world):
    watcher.run(world, None, Pages({URL: page(), URL2: page()}))
    for _ in range(2):
        out = watcher.run(world, None, Pages({URL: page("$650"), URL2: page()}))
    assert out["pages_changed"] == 0 and world.query(SourceCheck).filter_by(status="changed").count() == 1
    assert review.counts(world).get("pending", 0) == 0
    assert float(repo.get_approved(world, "gsg-travel-award").benefit_value) == 500


def test_changed_page_with_llm_creates_a_pending_version_only(world):
    watcher.run(world, None, Pages({URL: page(), URL2: page()}))
    llm = FakeLLM({URL: cand(650, "$650 per student per academic year"), URL2: cand(650, "$650 per student per academic year")})
    out = watcher.run(world, llm, Pages({URL: page("$650"), URL2: page("$650")}))
    assert out["pending_created"] == 1
    pending = review.list_versions(world, "pending")[0]
    assert pending.version == 2 and float(pending.benefit_value) == 650 and "WATCHER" in pending.flags
    assert float(repo.get_approved(world, "gsg-travel-award").benefit_value) == 500  # still live
    # Re-running does not stack versions.
    watcher.run(world, llm, Pages({URL: page("$700"), URL2: page("$700")}))
    assert len(review.list_versions(world, "pending")) == 1


def test_values_whose_quote_is_not_on_the_page_are_dropped(world):
    clean, dropped = extract_mod.verify(cand(900, "$900 per student"), page())
    assert clean["benefit_value"] is None and clean["benefit_label"] is None and dropped


def test_page_that_stops_mentioning_a_field_never_erases_it(world):
    approved = repo.public_dict(repo.get_approved(world, "gsg-travel-award"))
    c = cand()
    c["deadline_label"] = None
    changes, notes = diff_mod.changes_from(approved, c)
    assert "deadline_label" not in changes and any("no longer states" in n for n in notes)


def test_pages_that_disagree_become_conflicts(world):
    watcher.run(world, None, Pages({URL: page(), URL2: page()}))
    llm = FakeLLM({URL: cand(deadline="Mondays 4:00 PM - 9:00 PM"), URL2: cand(deadline="Mondays 3:00 PM - 9:00 PM")})
    watcher.run(world, llm, Pages({URL: page(deadline="Mondays 4:00 PM - 9:00 PM"), URL2: page(deadline="Mondays 3:00 PM - 9:00 PM")}))
    pending = review.list_versions(world, "pending")[0]
    assert pending.conflicts[0]["field"] == "deadline_label" and len(pending.conflicts[0]["versions"]) == 2


def test_extraction_failure_is_contained(world):
    watcher.run(world, None, Pages({URL: page(), URL2: page()}))
    out = watcher.run(world, FakeLLM({URL: LLMError("down"), URL2: LLMError("down")}), Pages({URL: page("$650"), URL2: page("$650")}))
    assert out.get("pending_created", 0) == 0


def test_students_hear_about_a_change_only_after_approval(world):
    world.add(Student(id="stu", needs=["conference"], created_at=datetime.now(timezone.utc) - timedelta(days=3)))
    world.flush()
    world.add(StudentFact(student_id="stu", field="level", value="masters"))
    world.commit()
    watcher.run(world, None, Pages({URL: page(), URL2: page()}))
    llm = FakeLLM({URL: cand(650, "$650 per student per academic year"), URL2: cand(650, "$650 per student per academic year")})
    watcher.run(world, llm, Pages({URL: page("$650"), URL2: page("$650")}))
    tags = lambda: [a["tag"] for a in client.get("/students/stu/alerts").json()["alerts"]]
    assert "UPDATED" not in tags()  # pending: invisible
    review.approve(world, "gsg-travel-award", 2, approved_by="manoj")
    change = world.query(ResourceChange).one()
    assert {c["field"] for c in change.changes} >= {"benefit_value", "benefit_label"}
    alert = next(a for a in client.get("/students/stu/alerts").json()["alerts"] if a["tag"] == "UPDATED")
    assert alert["simulated"] is False and any(d["old"] == "$500" and d["new"] == "$650" for d in alert["diff"])


def test_followup_is_drafted_a_week_after_sending_and_outcome_is_reported(world):
    world.add(Student(id="stu", needs=["conference"]))
    world.flush()
    now = datetime.now(timezone.utc)
    world.add(Claim(student_id="stu", resource_id="gsg-travel-award", stage="sent", sent_day=1, sent_at=now - timedelta(days=8)))
    world.commit()
    out = watcher.run(world, None, Pages({URL: page(), URL2: page()}), now=now)
    assert out["followups_drafted"] == 1
    alert = next(a for a in client.get("/students/stu/alerts").json()["alerts"] if a["key"] == "followup-gsg-travel-award")
    assert alert["ask_outcome"] and "GSG Travel Award" in alert["quote"] and alert["simulated"] is False
    r = client.post("/students/stu/claims/gsg-travel-award/outcome", json={"outcome": "received"}).json()
    assert r["stage"] == "Received" and r["simulated"] is False
    assert not any(a["key"] == "followup-gsg-travel-award" for a in client.get("/students/stu/alerts").json()["alerts"])
    assert client.post("/students/stu/claims/gsg-travel-award/outcome", json={"outcome": "maybe"}).status_code == 422
