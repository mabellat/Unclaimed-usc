"""The student card API: pseudonymous, tri-state, only fields an approved rule uses."""

import pytest
from fastapi.testclient import TestClient
from sqlalchemy import text

from tests.conftest import make_pending
from unclaimed import review
from unclaimed.main import app
from unclaimed.models import Claim

client = TestClient(app)
GRAD = {"kind": "rule", "field": "level", "op": "in", "value": ["masters", "phd_or_other_grad"], "text": "graduate student"}
FEE = {"kind": "rule", "field": "gsg_fee_paid", "op": "eq", "value": True, "text": "paid the fee"}


@pytest.fixture
def travel(session):
    make_pending(session, eligibility=[GRAD, FEE])
    review.approve(session, "gsg-travel-award", 1, approved_by="manoj")


def new_card(**body):
    r = client.post("/students", json=body)
    assert r.status_code == 201, r.text
    return r.json()


def test_card_is_pseudonymous_and_starts_unknown(travel):
    card = new_card()
    assert len(card["id"]) >= 12 and card["facts"] == {} and card["needs"] == []


def test_answers_are_saved_and_drive_the_match(travel):
    sid = new_card(needs=["conference"])["id"]
    m = client.get(f"/students/{sid}/match").json()
    assert [x["id"] for x in m["maybe"]] == ["gsg-travel-award"]
    assert m["next_question"]["field"] == "level"
    client.put(f"/students/{sid}/facts/level", json={"value": "masters"})
    client.put(f"/students/{sid}/facts/gsg_fee_paid", json={"value": True})
    m = client.get(f"/students/{sid}/match").json()
    assert [x["id"] for x in m["yes"]] == ["gsg-travel-award"]
    assert m["yes"][0]["basis"].startswith("Based on what you told us")


def test_skip_moves_to_the_next_question(travel):
    sid = new_card(needs=["conference"])["id"]
    assert client.get(f"/students/{sid}/match?skip=level").json()["next_question"]["field"] == "gsg_fee_paid"


def test_forgetting_an_answer_makes_it_unknown_again(travel):
    sid = new_card(facts={"level": "masters"}, needs=["conference"])["id"]
    card = client.delete(f"/students/{sid}/facts/level").json()
    assert "level" not in card["facts"]
    assert client.put(f"/students/{sid}/facts/level", json={"value": None}).status_code == 422


@pytest.mark.parametrize("field, value", [("level", "grad"), ("shoe_size", 9), ("citizenship", "f1_j1")])
def test_only_valid_answers_for_fields_an_approved_rule_uses(travel, field, value):
    # citizenship is a real field, but no approved rule in this test uses it.
    sid = new_card()["id"]
    assert client.put(f"/students/{sid}/facts/{field}", json={"value": value}).status_code == 422


def test_profile_fields_lists_only_fields_in_use(travel):
    assert set(client.get("/profile/fields").json()["fields"]) == {"level", "gsg_fee_paid"}


def test_deleting_the_card_deletes_everything(session, travel):
    sid = new_card(facts={"level": "masters"}, needs=["conference"])["id"]
    session.add(Claim(student_id=sid, resource_id="gsg-travel-award"))
    session.commit()
    assert client.delete(f"/students/{sid}").status_code == 204
    assert client.get(f"/students/{sid}").status_code == 404
    left = session.execute(text("SELECT (SELECT count(*) FROM student_facts) + (SELECT count(*) FROM claims)")).scalar()
    assert left == 0


def test_claim_stages_after_sent_are_simulated_by_the_clock(session, travel):
    sid = new_card(facts={"level": "masters", "gsg_fee_paid": True}, needs=["conference"])["id"]
    session.add(Claim(student_id=sid, resource_id="gsg-travel-award"))
    session.commit()
    assert client.get(f"/students/{sid}/claims").json()["claims"][0]["stage"] == "Drafted"
    client.post(f"/students/{sid}/claims/gsg-travel-award/sent")
    stages = []
    for day in (1, 7, 30):
        client.put(f"/students/{sid}/clock", json={"day": day})
        stages.append(client.get(f"/students/{sid}/claims").json()["claims"][0]["stage"])
    assert stages == ["Sent", "In review", "Received"]
    assert client.put(f"/students/{sid}/clock", json={"day": 3}).status_code == 422


def test_alerts_follow_the_clock(session, travel):
    sid = new_card(facts={"level": "masters", "gsg_fee_paid": True}, needs=["conference"])["id"]
    first = client.get(f"/students/{sid}/alerts").json()
    assert [a["tag"] for a in first["alerts"]] == ["WELCOME"]
    assert "worth up to $500" in first["alerts"][0]["body"]
    session.add(Claim(student_id=sid, resource_id="gsg-travel-award"))
    session.commit()
    client.put(f"/students/{sid}/clock", json={"day": 7})
    assert "REMINDER" in [a["tag"] for a in client.get(f"/students/{sid}/alerts").json()["alerts"]]


def test_demo_personas_load_through_the_normal_card_api(travel):
    personas = client.get("/demo/personas").json()["personas"]
    priya = next(p for p in personas if p["id"] == "priya-masters-research-conference")
    # The demo goes through the same API; fields no approved rule uses are refused like any card.
    facts = {k: v for k, v in priya["facts"].items() if k in ("level", "gsg_fee_paid")}
    sid = new_card(facts=facts, needs=priya["needs"])["id"]
    assert [x["id"] for x in client.get(f"/students/{sid}/match").json()["yes"]] == ["gsg-travel-award"]
