from unclaimed import repo
from unclaimed.allowlist import load_sources
from unclaimed.candidates import load_candidates
from unclaimed.import_candidates import import_records
from unclaimed.models import Resource
from unclaimed.vocab import CATEGORIES, NEEDS

RECORDS = load_candidates()
BY_ID = {r["id"]: r for r in RECORDS}


def test_all_candidates_parsed_except_rejected_34():
    # 44 numbered records (1-45 without 34); record 25 is split into undergrad and grad.
    assert len(RECORDS) == 45
    assert "usc-first-generation-scholarship" not in BY_ID
    assert {"financial-aid-appeal-undergrad", "financial-aid-appeal-grad"} <= set(BY_ID)
    assert "financial-aid-appeal" not in BY_ID


def test_every_record_has_category_relevance_source_and_quote():
    for r in RECORDS:
        assert r["category"] in CATEGORIES, r["id"]
        assert set(r["relevance"]) <= set(NEEDS), r["id"]
        assert r["source_url"] and r["evidence_quote"], r["id"]
        assert r["owner_verified"] and r["verification_note"], r["id"]


def test_import_creates_pending_only(session):
    added, skipped = import_records(session, RECORDS)
    assert len(added) == 45 and skipped == []
    statuses = {r.status for r in session.query(Resource)}
    assert statuses == {"pending"}
    assert all(r.approved_by is None and r.data_version is None for r in session.query(Resource))
    assert repo.list_approved(session) == []


def test_import_is_idempotent(session):
    import_records(session, RECORDS)
    added, skipped = import_records(session, RECORDS)
    assert added == [] and len(skipped) == 45


def test_null_stays_null():
    assert BY_ID["csi-emergency-loan"]["deadline_label"] is None  # page says closed, no reopening date
    assert BY_ID["sbn-supplemental-funding"]["benefit_value"] is None  # amount not stated
    assert BY_ID["half-century-trojans"]["benefit_value"] is None  # amount not stated
    assert BY_ID["annenberg-emergency-aid"]["benefit_value"] is None  # "average award" is not an amount
    assert BY_ID["dornsife-continuing-student-scholarship"]["deadline_label"] is None


def test_eligibility_is_prose_with_unknown_fields():
    for r in RECORDS:
        for c in r["eligibility"]:
            assert c["text"] and c["field"] is None and c["op"] is None


def test_flags_are_kept():
    assert "F-1 or J-1" in BY_ID["csi-emergency-loan"]["flags"]
    assert "6 days away" in BY_ID["purf"]["flags"]


def test_proposed_values_are_marked():
    assert {"title", "relevance"} <= set(BY_ID["town-and-gown"]["proposed_fields"])
    assert "category" in BY_ID["writing-center"]["proposed_fields"]
    assert "category" not in BY_ID["gsg-travel-award"]["proposed_fields"]


def test_every_record_source_is_in_sources_json():
    listed = {s["url"] for s in load_sources()["sources"]}
    assert {r["source_url"] for r in RECORDS} <= listed
