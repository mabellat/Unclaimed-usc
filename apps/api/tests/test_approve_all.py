import pytest
from fastapi.testclient import TestClient

from tests.conftest import make_pending
from unclaimed import repo, review
from unclaimed.main import app
from unclaimed.models import ReviewLog

client = TestClient(app)
AUTH = ("owner", "test-password")


def _keys(rs):
    return {(r.id, r.version) for r in rs}


def _setup(session):
    make_pending(session, rid="good-a")
    make_pending(session, rid="good-b")
    make_pending(session, rid="no-source", source_url=None)
    make_pending(session, rid="no-quote", evidence_quote="  ")
    make_pending(session, rid="no-category", category=None)
    make_pending(session, rid="usc-first-generation-scholarship")  # candidate 34
    make_pending(session, rid="was-rejected")
    review.reject(session, "was-rejected", 1)


def test_plan_skips_records_with_reasons(session):
    _setup(session)
    ready, skipped = review.plan_approve_all(session)
    assert _keys(ready) == {("good-a", 1), ("good-b", 1)}
    reasons = {r.id: reason for r, reason in skipped}
    assert reasons == {
        "no-source": "no source URL",
        "no-quote": "no evidence quote",
        "no-category": "no valid category",
        "usc-first-generation-scholarship": "rejected by owner (candidate 34), never approved",
    }


def test_approve_all_stamps_each_record_like_single_approve(session):
    _setup(session)
    ready, _ = review.plan_approve_all(session)
    approved, skipped, entry = review.approve_all(session, "manoj", _keys(ready))
    assert {r.id for r in approved} == {"good-a", "good-b"}
    versions = [r.data_version for r in approved]
    assert len(set(versions)) == 2  # each record gets its own bump
    for r in approved:
        assert r.status == "approved" and r.approved_by == "manoj" and r.approved_at is not None
    assert {r.id for r in repo.list_approved(session)} == {"good-a", "good-b"}
    assert review.get_version(session, "was-rejected", 1).status == "rejected"
    assert review.get_version(session, "usc-first-generation-scholarship", 1).status == "pending"


def test_approve_all_logs_one_bulk_action(session):
    _setup(session)
    ready, _ = review.plan_approve_all(session)
    review.approve_all(session, "manoj", _keys(ready))
    logs = session.query(ReviewLog).all()
    assert len(logs) == 1
    log = logs[0]
    assert log.action == "approve_all" and log.actor == "manoj" and log.at is not None
    assert {a["id"] for a in log.details["approved"]} == {"good-a", "good-b"}
    assert len(log.details["skipped"]) == 4


def test_approve_all_refuses_if_queue_changed_since_confirmation(session):
    _setup(session)
    ready, _ = review.plan_approve_all(session)
    make_pending(session, rid="arrived-later")
    with pytest.raises(review.ReviewError, match="changed"):
        review.approve_all(session, "manoj", _keys(ready))
    session.rollback()
    assert repo.list_approved(session) == []
    assert session.query(ReviewLog).count() == 0


def test_single_approve_also_never_approves_34(session):
    make_pending(session, rid="usc-first-generation-scholarship")
    with pytest.raises(review.ReviewError, match="candidate 34"):
        review.approve(session, "usc-first-generation-scholarship", 1, "manoj")


def test_admin_confirm_page_shows_count_then_approves(session):
    _setup(session)
    page = client.get("/admin/approve-all", auth=AUTH)
    assert "Approve 2 records" in page.text and "no source URL" in page.text
    assert repo.list_approved(session) == []  # the confirm page alone approves nothing
    keys = ["good-a|1", "good-b|1"]
    done = client.post("/admin/approve-all", data={"key": keys}, auth=AUTH)
    assert done.status_code == 200 and "Bulk approval done" in done.text
    session.expire_all()
    assert {r.approved_by for r in repo.list_approved(session)} == {"owner"}
