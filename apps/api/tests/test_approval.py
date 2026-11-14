"""A pending record is never readable as approved; approving stamps the four fields."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import make_pending
from unclaimed import repo, review
from unclaimed.main import app

client = TestClient(app)
AUTH = ("owner", "test-password")


def test_pending_record_is_not_readable(session):
    make_pending(session)
    assert repo.list_approved(session) == []
    assert repo.get_approved(session, "gsg-travel-award") is None
    assert client.get("/resources").json()["resources"] == []
    assert client.get("/resources/gsg-travel-award").status_code == 404


def test_rejected_record_is_not_readable(session):
    make_pending(session)
    review.reject(session, "gsg-travel-award", 1)
    assert repo.list_approved(session) == []
    assert client.get("/resources/gsg-travel-award").status_code == 404


def test_approve_sets_status_stamps_and_data_version(session):
    make_pending(session)
    r = review.approve(session, "gsg-travel-award", 1, approved_by="manoj")
    assert r.status == "approved"
    assert r.approved_by == "manoj"
    assert r.approved_at is not None
    assert r.data_version is not None
    body = client.get("/resources/gsg-travel-award").json()
    assert body["data_version"] == r.data_version
    assert body["resource"]["approved_by"] == "manoj"


def test_each_approval_bumps_data_version(session):
    make_pending(session, rid="a")
    make_pending(session, rid="b")
    first = review.approve(session, "a", 1, approved_by="manoj").data_version
    second = review.approve(session, "b", 1, approved_by="manoj").data_version
    assert second > first
    assert client.get("/resources").json()["data_version"] == second


def test_new_version_stays_invisible_until_approved_then_supersedes(session):
    make_pending(session)
    review.approve(session, "gsg-travel-award", 1, approved_by="manoj")
    make_pending(session, version=2, benefit_label="$650 per academic year", benefit_value=650)
    assert repo.get_approved(session, "gsg-travel-award").version == 1
    review.approve(session, "gsg-travel-award", 2, approved_by="manoj")
    assert repo.get_approved(session, "gsg-travel-award").version == 2
    assert review.get_version(session, "gsg-travel-award", 1).status == "superseded"


@pytest.mark.parametrize("missing", ["source_url", "evidence_quote"])
def test_cannot_approve_without_source_or_quote(session, missing):
    make_pending(session, **{missing: None})
    with pytest.raises(review.ReviewError, match="cannot approve"):
        review.approve(session, "gsg-travel-award", 1, approved_by="manoj")
    assert repo.list_approved(session) == []


def test_only_pending_records_can_change(session):
    make_pending(session)
    review.approve(session, "gsg-travel-award", 1, approved_by="manoj")
    with pytest.raises(review.ReviewError):
        review.edit(session, "gsg-travel-award", 1, {"title": "Changed"})
    with pytest.raises(review.ReviewError):
        review.reject(session, "gsg-travel-award", 1)
    with pytest.raises(review.ReviewError):
        review.approve(session, "gsg-travel-award", 1, approved_by="manoj")


def test_edit_clears_proposed_marker_only_for_changed_fields(session):
    make_pending(session, proposed_fields=["provider", "relevance"])
    r = review.edit(session, "gsg-travel-award", 1, {"provider": "Graduate Student Government", "relevance": ["conference"]})
    assert r.proposed_fields == ["relevance"]


def test_public_api_hides_review_only_fields(session):
    make_pending(session, flags="check this", candidate_text="raw")
    review.approve(session, "gsg-travel-award", 1, approved_by="manoj")
    resource = client.get("/resources/gsg-travel-award").json()["resource"]
    assert "flags" not in resource and "candidate_text" not in resource


def test_admin_requires_login(session):
    assert client.get("/admin").status_code == 401
    assert client.get("/admin", auth=("owner", "wrong")).status_code == 401


def test_admin_one_click_approve_stamps_logged_in_owner(session):
    make_pending(session)
    page = client.get("/admin", auth=AUTH)
    assert page.status_code == 200 and "GSG Travel Award" in page.text
    client.post("/admin/resources/gsg-travel-award/1/approve", auth=AUTH)
    r = repo.get_approved(session, "gsg-travel-award")
    session.refresh(r)
    assert r.approved_by == "owner"


def test_admin_edit_blank_field_becomes_null(session):
    make_pending(session, deadline_label="Rolling")
    form = {"title": "GSG Travel Award", "category": "cash", "relevance": "conference",
            "deadline_label": "  ", "source_url": "https://engage.usc.edu/Gsg/gsg-ta/",
            "evidence_quote": "$500 per student per academic year"}
    client.post("/admin/resources/gsg-travel-award/1/edit", data=form, auth=AUTH)
    r = review.get_version(session, "gsg-travel-award", 1)
    session.refresh(r)
    assert r.deadline_label is None
    assert r.status == "pending"


def test_owner_can_start_a_new_version_of_an_approved_record(session):
    make_pending(session)
    review.approve(session, "gsg-travel-award", 1, approved_by="manoj")
    r = client.post("/admin/resources/gsg-travel-award/1/new-version", auth=AUTH, follow_redirects=False)
    assert r.headers["location"].endswith("/gsg-travel-award/2")
    assert review.get_version(session, "gsg-travel-award", 2).status == "pending"
    assert repo.get_approved(session, "gsg-travel-award").version == 1
    again = client.post("/admin/resources/gsg-travel-award/1/new-version", auth=AUTH, follow_redirects=False)
    assert again.headers["location"].endswith("/gsg-travel-award/2")  # reuses the open pending version
