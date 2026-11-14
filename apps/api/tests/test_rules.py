"""Structured eligibility: the data files, criterion validation, the /admin line format,
and new pending versions that leave the approved version live."""

import pytest
from fastapi.testclient import TestClient

from tests.conftest import make_pending
from unclaimed import repo, review
from unclaimed.candidates import load_candidates
from unclaimed.main import app
from unclaimed.rules import criterion_error, fields_used, format_line, load_fields, load_rules, parse_line
from unclaimed.structure_rules import structure_all

client = TestClient(app)
AUTH = ("owner", "test-password")
GRAD = {"kind": "rule", "field": "level", "op": "in", "value": ["masters", "phd_or_other_grad"], "text": "graduate student"}
FEE = {"kind": "rule", "field": "gsg_fee_paid", "op": "eq", "value": True, "text": "paid the fee"}


# --- data files -----------------------------------------------------------------

def test_every_rule_in_the_rules_file_is_valid():
    for rid, spec in load_rules().items():
        assert spec["eligibility"], f"{rid} has no criteria"
        for c in spec["eligibility"]:
            assert criterion_error(c) is None, f"{rid}: {criterion_error(c)}"


def test_every_profile_field_is_used_by_a_rule():
    # Non-negotiable 4: a profile field exists only if a rule uses it.
    used = fields_used([spec["eligibility"] for spec in load_rules().values()])
    assert set(load_fields()) == used


def test_sensitive_fields_say_why_we_ask():
    for name, f in load_fields().items():
        if f.get("sensitive"):
            assert f.get("why"), f"{name} is sensitive but has no 'why we ask' line"


def test_rules_file_covers_every_seeded_resource():
    seeded = {rec["id"] for rec in load_candidates()}
    assert set(load_rules()) == seeded


def test_moved_text_comes_from_the_seeded_prose():
    # Steps, docs and notes moved out of the criteria must come from the approved record.
    seeded = {rec["id"]: rec for rec in load_candidates()}
    for rid, spec in load_rules().items():
        prose = " ".join(c["text"] for c in seeded[rid]["eligibility"])
        for text in spec.get("steps_add", []) + spec.get("docs_add", []):
            assert text in prose, f"{rid}: {text!r} is not in the approved criteria"


# --- criterion validation ---------------------------------------------------------

@pytest.mark.parametrize("c, message", [
    ({"text": "graduate student"}, "prose only"),
    ({"kind": "rule", "field": "favourite_colour", "op": "eq", "value": "red", "text": "x"}, "unknown profile field"),
    ({"kind": "rule", "field": "level", "op": "includes", "value": "masters", "text": "x"}, "cannot use op"),
    ({"kind": "rule", "field": "level", "op": "eq", "value": "grad", "text": "x"}, "has no value grad"),
    ({"kind": "rule", "field": "gsg_fee_paid", "op": "eq", "value": "yes", "text": "x"}, "true or false"),
    ({"kind": "rule", "field": "level", "op": "in", "value": "masters", "text": "x"}, "list of values"),
    ({"kind": "office", "text": "  "}, "no text"),
])
def test_invalid_criteria_are_rejected(c, message):
    assert message in criterion_error(c)


@pytest.mark.parametrize("c", [GRAD, FEE, {"kind": "office", "text": "demonstrated financial need"},
                               {"kind": "rule", "field": "schools", "op": "includes", "value": "dornsife", "text": "x"}])
def test_admin_line_round_trips(c):
    assert parse_line(format_line(c)) == c


def test_line_without_separator_is_prose():
    assert parse_line("graduate student") == {"kind": None, "text": "graduate student"}


# --- approval gate ------------------------------------------------------------------

def test_prose_criterion_blocks_approval(session):
    make_pending(session, eligibility=[{"text": "registered graduate student"}])
    with pytest.raises(review.ReviewError, match="prose only"):
        review.approve(session, "gsg-travel-award", 1, approved_by="manoj")
    assert repo.list_approved(session) == []


def test_structured_criteria_can_be_approved(session):
    make_pending(session, eligibility=[GRAD, {"kind": "office", "text": "primary caretaker"}])
    assert review.approve(session, "gsg-travel-award", 1, approved_by="manoj").status == "approved"


# --- new versions -------------------------------------------------------------------

def test_new_version_is_pending_and_old_stays_live_until_approved(session):
    _approve_seed(session, "gsg-travel-award")
    r1 = review.get_version(session, "gsg-travel-award", 1)

    r2 = review.new_version(session, "gsg-travel-award", {"eligibility": [GRAD, FEE]})
    assert (r2.version, r2.status, r2.approved_by, r2.data_version) == (2, "pending", None, None)
    assert r2.title == r1.title and r2.source_url == r1.source_url
    assert repo.get_approved(session, "gsg-travel-award").version == 1

    changed = [field for field, _, _ in review.diff(r1, r2)]
    assert changed == ["eligibility"]

    assert review.new_version(session, "gsg-travel-award", {"eligibility": [GRAD]}) is None  # already pending
    review.approve(session, "gsg-travel-award", 2, approved_by="manoj")
    assert repo.get_approved(session, "gsg-travel-award").eligibility == [GRAD, FEE]
    assert review.get_version(session, "gsg-travel-award", 1).status == "superseded"


def test_new_version_needs_an_approved_version(session):
    make_pending(session)
    with pytest.raises(review.ReviewError, match="no approved version"):
        review.new_version(session, "gsg-travel-award", {"eligibility": [GRAD]})


def _approve_seed(session, rid):
    rec = next(r for r in load_candidates() if r["id"] == rid)
    make_pending(session, rid=rid, title=rec["title"], eligibility=rec["eligibility"],
                 steps=rec["steps"], docs=rec["docs"], note=rec["note"])
    r = review.get_version(session, rid, 1)
    r.status, r.approved_by, r.approved_at, r.data_version = "approved", "manoj", r.created_at, 1
    session.commit()


def test_structure_all_creates_pending_versions_and_is_rerunnable(session):
    _approve_seed(session, "gsg-emergency-fund")
    report = structure_all(session)
    assert report["created"] == ["gsg-emergency-fund"]
    r2 = review.get_version(session, "gsg-emergency-fund", 2)
    assert r2.status == "pending" and review.approval_blockers(r2) == []
    assert "member of the GSG EngageSC group" in [s["text"] for s in r2.steps]
    assert "NOT covered" in r2.note
    assert structure_all(session)["already_pending"] == ["gsg-emergency-fund"]
    assert repo.get_approved(session, "gsg-emergency-fund").version == 1


def test_admin_shows_diff_and_saves_rule_lines(session):
    _approve_seed(session, "gsg-travel-award")
    structure_all(session)
    page = client.get("/admin/resources/gsg-travel-award/2", auth=AUTH)
    assert "Changes from the live version (v1" in page.text
    assert "level in masters, phd_or_other_grad :: " in page.text

    r2 = review.get_version(session, "gsg-travel-award", 2)
    form = {"title": r2.title, "category": r2.category, "relevance": "conference",
            "source_url": r2.source_url, "evidence_quote": r2.evidence_quote,
            "eligibility": "level eq masters :: master's students only\noffice :: the office checks it"}
    client.post("/admin/resources/gsg-travel-award/2/edit", data=form, auth=AUTH)
    session.refresh(r2)
    assert r2.eligibility == [
        {"kind": "rule", "field": "level", "op": "eq", "value": "masters", "text": "master's students only",
         "source_url": None, "evidence_quote": None},
        {"kind": "office", "text": "the office checks it", "source_url": None, "evidence_quote": None},
    ]
