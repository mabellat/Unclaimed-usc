"""The rules engine: golden profiles, properties, and the /match endpoint.

Golden and property tests run on data/approved_resources.json, the snapshot of what the
owner approved (make export-approved), so they need no database.
"""

import json
import random

import pytest
from fastapi.testclient import TestClient
from hypothesis import given, settings
from hypothesis import strategies as st

from tests.conftest import make_pending
from unclaimed import DATA, review
from unclaimed.main import app
from unclaimed.match import ProfileError, SELF_REPORTED, run_match
from unclaimed.rules import load_fields, load_rules
from unclaimed.vocab import NEEDS

SNAPSHOT = json.loads((DATA / "approved_resources.json").read_text())
RESOURCES = SNAPSHOT["resources"]
PERSONAS = json.loads((DATA / "demo_personas.json").read_text())["personas"]
GOLDEN = json.loads((DATA / "golden_profiles.json").read_text())["profiles"] + PERSONAS
FIELDS = load_fields()
client = TestClient(app)


def ids(results):
    return [m["id"] for m in results]


# --- golden profiles -----------------------------------------------------------------

def test_snapshot_matches_the_rules_file():
    # The snapshot must be the approved structured data, or the golden tests prove nothing.
    rules = load_rules()
    assert {r["id"] for r in RESOURCES} == set(rules)
    for r in RESOURCES:
        assert r["status"] == "approved" and r["data_version"] is not None
        logic = lambda crit: [{k: v for k, v in c.items() if k not in ("source_url", "evidence_quote", "text")} for c in crit]
        assert logic(r["eligibility"]) == logic(rules[r["id"]]["eligibility"]), r["id"]


def test_at_least_twelve_golden_profiles():
    assert len(GOLDEN) >= 12
    assert 3 <= len(PERSONAS) <= 5


@pytest.mark.parametrize("p", [p for p in PERSONAS if p["moment"].get("field")], ids=lambda p: p["id"])
def test_demo_moment_flips_exactly_what_it_says(p):
    before = run_match(RESOURCES, p["facts"], p["needs"])
    after = run_match(RESOURCES, p["facts"] | {p["moment"]["field"]: p["moment"]["value"]}, p["needs"])
    gained_yes = set(ids(after["yes"])) - set(ids(before["yes"]))
    became_no = set(ids(after["no"])) - set(ids(before["no"]))
    assert gained_yes == set(p["moment"].get("flips_to_yes", []))
    assert became_no == set(p["moment"].get("flips_to_no", []))


@pytest.mark.parametrize("profile", GOLDEN, ids=[p["id"] for p in GOLDEN])
def test_golden_profile(profile):
    result = run_match(RESOURCES, profile["facts"], profile["needs"])
    expected = profile["expected"]
    assert ids(result["yes"]) == expected["yes"]
    assert set(ids(result["maybe"])) == set(expected["maybe"])
    nq = result["next_question"]
    assert ({"field": nq["field"], "count": nq["count"]} if nq else None) == expected["next_question"]
    assert result["data_version"] == SNAPSHOT["data_version"]


def test_every_approved_resource_is_reachable_by_a_golden_profile():
    reached = set()
    for p in GOLDEN:
        reached |= set(ids(run_match(RESOURCES, p["facts"], p["needs"])["yes"]))
    assert reached == {r["id"] for r in RESOURCES}


# --- semantics -------------------------------------------------------------------------

def test_relevance_hides_resources_for_unselected_needs():
    shown = run_match(RESOURCES, {"enrolled": True}, ["food"])
    all_shown = set(ids(shown["yes"] + shown["maybe"] + shown["no"]))
    assert "trojan-food-pantry" in all_shown
    assert "gsg-travel-award" not in all_shown  # conference only


def test_housing_implies_legal():
    result = run_match(RESOURCES, {"enrolled": True}, ["housing"])
    assert "legal" in result["needs"]
    assert "usc-immigration-clinic" in ids(result["yes"])  # relevance: legal only


def test_yes_says_it_is_self_reported_and_lists_office_judgments():
    m = next(m for m in run_match(RESOURCES, {"enrolled": True}, ["food"])["yes"] if m["id"] == "trojan-food-pantry")
    assert m["basis"] == SELF_REPORTED
    assert "experiencing food insecurity" in m["office_decides"]
    assert [w["field"] for w in m["why"]] == ["enrolled"]


def test_maybe_lists_the_fields_to_ask():
    m = next(m for m in run_match(RESOURCES, {"enrolled": True}, ["money"])["maybe"] if m["id"] == "csi-emergency-loan")
    assert m["unknown"] == ["has_ssn"]


def test_null_fact_is_unknown_not_false():
    with_null = run_match(RESOURCES, {"enrolled": None}, [])
    assert ids(with_null["maybe"]) == ["campus-support-and-intervention", "its-laptop-loaner"]


def test_prose_criterion_can_never_be_yes():
    r = dict(RESOURCES[0], relevance=[], eligibility=[{"text": "registered graduate student"}])
    assert run_match([r], {}, [])["maybe"][0]["id"] == r["id"]


def test_ties_prefer_non_sensitive_questions():
    # has_ssn (sensitive) and usc_legacy_50yr each appear in one maybe here.
    p = next(p for p in GOLDEN if p["id"] == "viterbi-international-undergrad")
    assert run_match(RESOURCES, p["facts"], p["needs"])["next_question"]["sensitive"] is False


@pytest.mark.parametrize("facts, message", [
    ({"level": "grad"}, "level must be one of"),
    ({"enrolled": "yes"}, "true or false"),
    ({"schools": "viterbi"}, "must be a list"),
    ({"shoe_size": 9}, "unknown field"),
])
def test_invalid_profiles_are_refused(facts, message):
    with pytest.raises(ProfileError, match=message):
        run_match(RESOURCES, facts, [])


def test_field_no_approved_rule_uses_is_refused():
    only_open = [r for r in RESOURCES if r["id"] == "its-laptop-loaner"]
    with pytest.raises(ProfileError, match="no approved rule uses: level"):
        run_match(only_open, {"level": "masters"}, [])


# --- properties --------------------------------------------------------------------------

def _value(field):
    spec = FIELDS[field]
    if spec["type"] == "bool":
        return st.booleans()
    if spec["type"] == "enum":
        return st.sampled_from(spec["values"])
    return st.lists(st.sampled_from(spec["values"]), unique=True)


facts_strategy = st.fixed_dictionaries({}, optional={f: _value(f) for f in FIELDS})
needs_strategy = st.lists(st.sampled_from(NEEDS), unique=True)


def _statuses(result):
    return {m["id"]: m["status"] for key in ("yes", "maybe", "no") for m in result[key]}


@settings(max_examples=300, deadline=None)
@given(facts=facts_strategy, needs=needs_strategy)
def test_unknown_never_produces_yes(facts, needs):
    for m in run_match(RESOURCES, facts, needs)["yes"]:
        assert m["unknown"] == [] and m["unknown_criteria"] == []
        rules = [c for c in next(r for r in RESOURCES if r["id"] == m["id"])["eligibility"] if c["kind"] == "rule"]
        assert all(c["field"] in facts for c in rules)


@settings(max_examples=300, deadline=None)
@given(facts=facts_strategy, needs=needs_strategy, data=st.data())
def test_adding_a_fact_never_flips_no_and_yes_needs_a_matching_criterion(facts, needs, data):
    missing = [f for f in FIELDS if f not in facts]
    if not missing:
        return
    field = data.draw(st.sampled_from(missing))
    before = _statuses(run_match(RESOURCES, facts, needs))
    after_result = run_match(RESOURCES, facts | {field: data.draw(_value(field))}, needs)
    after = _statuses(after_result)
    assert before.keys() == after.keys()  # facts never change relevance
    for rid, status in before.items():
        if status == "no":
            assert after[rid] == "no"
        if status != "yes" and after[rid] == "yes":
            m = next(m for m in after_result["yes"] if m["id"] == rid)
            assert field in [w["field"] for w in m["why"]]  # the new fact is the matching criterion


@settings(max_examples=200, deadline=None)
@given(facts=facts_strategy, needs=needs_strategy, seed=st.integers())
def test_results_are_deterministic_and_order_independent(facts, needs, seed):
    first = run_match(RESOURCES, facts, needs)
    rng = random.Random(seed)
    shuffled_resources = rng.sample(RESOURCES, len(RESOURCES))
    shuffled_facts = dict(rng.sample(list(facts.items()), len(facts)))
    shuffled_needs = rng.sample(needs, len(needs))
    assert run_match(shuffled_resources, shuffled_facts, shuffled_needs) == first


@settings(max_examples=200, deadline=None)
@given(facts=facts_strategy, needs=needs_strategy)
def test_next_question_is_the_most_common_unknown(facts, needs):
    result = run_match(RESOURCES, facts, needs)
    nq = result["next_question"]
    counts = {}
    for m in result["maybe"]:
        for f in m["unknown"]:
            counts[f] = counts.get(f, 0) + 1
    if not counts:
        assert nq is None
    else:
        assert nq["count"] == max(counts.values()) == counts[nq["field"]]
        assert nq["field"] not in facts


# --- /match endpoint (reads approved rows only) -------------------------------------------

def _approve(session, rid, **fields):
    make_pending(session, rid=rid, **fields)
    review.approve(session, rid, 1, approved_by="manoj")


def test_match_endpoint_uses_approved_only(session):
    grad = {"kind": "rule", "field": "level", "op": "in", "value": ["masters", "phd_or_other_grad"], "text": "graduate student"}
    _approve(session, "gsg-travel-award", eligibility=[grad])
    make_pending(session, rid="pending-thing", relevance=[], eligibility=[])
    body = client.post("/match", json={"facts": {"level": "masters"}, "needs": ["conference"]}).json()
    assert ids(body["yes"]) == ["gsg-travel-award"]
    assert "pending-thing" not in json.dumps(body)
    assert body["data_version"] == body["yes"][0]["data_version"]


def test_match_endpoint_refuses_bad_input(session):
    assert client.post("/match", json={"facts": {}, "needs": ["pizza"]}).status_code == 422
    assert client.post("/match", json={"facts": {"level": "grad"}, "needs": []}).status_code == 422
