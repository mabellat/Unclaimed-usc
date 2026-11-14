"""Claim Agent and Navigator, with a fake page fetcher and a fake Claude.

Covers: approved-only, yes-only, no send tool, groundedness (pass, fail-and-redraft, template
fallback), source mismatches flagged never trusted, refusal tests, and the Navigator never
setting sensitive fields.
"""

import json
from datetime import date
from types import SimpleNamespace

import pytest
from fastapi.testclient import TestClient

from tests.conftest import make_pending
from unclaimed import review
from unclaimed.agents import claim_graph, claim_tools, grounding, llm as llm_mod, navigator
from unclaimed.agents.llm import LLMError
from unclaimed.main import app
from unclaimed.models import AgentRun, Claim, SourceCheck, Student, StudentFact

client = TestClient(app)
GRAD = {"kind": "rule", "field": "level", "op": "in", "value": ["masters", "phd_or_other_grad"], "text": "graduate student"}
FEE = {"kind": "rule", "field": "gsg_fee_paid", "op": "eq", "value": True, "text": "paid the Graduate Student Programming Fee"}
QUOTE = "$500 per student per academic year"
PAGE = f"<html><body><h1>GSG Travel Award</h1><p>{QUOTE}.</p>{'<p>More text about the award and how to apply.</p>' * 20}</body></html>"
TODAY = date(2026, 11, 13)


def fetch_ok(url):
    return 200, PAGE


def fetch_changed(url):
    return 200, PAGE.replace(QUOTE, "$650 per student per academic year")


def fetch_js(url):
    return 200, "<html><body><div id=app></div><script>render()</script></body></html>"


@pytest.fixture
def setup(session):
    make_pending(session, eligibility=[GRAD, FEE], provider="Graduate Student Government",
                 steps=[{"text": "Apply on EngageSC before the trip", "evidence_quote": None}],
                 docs=[{"text": "Conference acceptance or registration", "evidence_quote": None}],
                 deadline_label="Applications due Tuesday, December 1, 2026", note="not tuition")
    review.approve(session, "gsg-travel-award", 1, approved_by="manoj")
    session.add(Student(id="stu1", needs=["conference"]))
    session.flush()
    session.add_all([StudentFact(student_id="stu1", field="level", value="masters"),
                     StudentFact(student_id="stu1", field="gsg_fee_paid", value=True)])
    session.commit()
    return session


def run(session, llm=None, fetch=fetch_ok, student="stu1"):
    return list(claim_graph.run_claim(session, student, "gsg-travel-award", llm, fetch, TODAY))


class FakeLLM:
    model = "fake"

    def __init__(self, drafts):
        self.drafts, self.calls = list(drafts), []

    def json(self, system, user, schema, effort="medium"):
        self.calls.append(user)
        d = self.drafts.pop(0)
        if isinstance(d, Exception):
            raise d
        return d


GOOD = {"subject": "Question about the GSG Travel Award", "greeting": "Hello,", "closing": "Thank you!",
        "sentences": [
            {"text": "I'm writing about the GSG Travel Award from Graduate Student Government.", "cites": ["title", "provider"]},
            {"text": "I am a master's student.", "cites": ["profile:level"]},
            {"text": "I understand the award is $500 per student per academic year.", "cites": ["benefit"]},
            {"text": "Could you confirm what I should submit?", "cites": []}]}
INVENTED = {**GOOD, "sentences": [{"text": "I understand the award is $900 and covers tuition.", "cites": ["benefit"]}]}
CLAIMS_ELIGIBLE = {**GOOD, "sentences": [{"text": "I am eligible for the GSG Travel Award.", "cites": ["title"]}]}


# --- the graph --------------------------------------------------------------------------

def test_template_run_produces_a_grounded_packet_without_an_llm(setup):
    events = run(setup)
    nodes = [e["event"]["node"] for e in events if "event" in e]
    assert nodes == ["plan", "verify_source", "gather_requirements", "draft", "groundedness_check", "present_packet"]
    claim = setup.get(Claim, ("stu1", "gsg-travel-award"))
    p = claim.packet
    assert claim.stage == "drafted" and p["sent_by_agent"] is False
    assert p["draft"]["mode"] == "template" and p["grounding"]["passed"]
    assert p["source_check"]["status"] == "verified"
    kinds = [c["kind"] for c in p["checklist"]]
    assert kinds.count("confirm") == 2 and "step" in kinds and "prepare" in kinds and "deadline" in kinds
    assert p["deadline"]["date"] == "2026-12-01" and p["has_calendar"]
    run_row = setup.query(AgentRun).one()
    assert run_row.status == "done" and len(run_row.trace) == 6


def test_card_with_answers_other_resources_use_still_runs(setup):
    setup.add(StudentFact(student_id="stu1", field="enrolled", value=True))
    make_pending(setup, rid="writing-center", relevance=[], eligibility=[
        {"kind": "rule", "field": "enrolled", "op": "eq", "value": True, "text": "all current USC students"}])
    review.approve(setup, "writing-center", 1, approved_by="manoj")
    events = run(setup)
    assert "done" in events[-1], events[-1]


def test_claude_draft_that_passes_is_used(setup):
    fake = FakeLLM([GOOD])
    run(setup, llm=fake)
    p = setup.get(Claim, ("stu1", "gsg-travel-award")).packet
    assert p["draft"]["mode"] == "claude" and "$500" in p["draft"]["text"]


def test_invented_facts_fail_the_check_and_get_redrafted(setup):
    fake = FakeLLM([INVENTED, GOOD])
    events = run(setup, llm=fake)
    checks = [e["event"] for e in events if "event" in e and e["event"]["node"] == "groundedness_check"]
    assert [c["passed"] for c in checks] == [False, True]
    assert "900" in json.dumps(checks[0]["issues"])
    assert "failed the groundedness check" in fake.calls[1]  # the issues are fed back


def test_claiming_eligibility_is_never_presented(setup):
    fake = FakeLLM([CLAIMS_ELIGIBLE] * 3)
    run(setup, llm=fake)
    p = setup.get(Claim, ("stu1", "gsg-travel-award")).packet
    assert p["draft"]["mode"] == "template"  # three failures, then the grounded template
    assert "eligible" not in p["draft"]["text"].lower()


def test_llm_outage_falls_back_to_the_template(setup):
    run(setup, llm=FakeLLM([LLMError("down")]))
    assert setup.get(Claim, ("stu1", "gsg-travel-award")).packet["draft"]["mode"] == "template"


@pytest.mark.parametrize("fetch, status", [(fetch_changed, "changed"), (fetch_js, "unreadable"),
                                           (lambda u: (_ for _ in ()).throw(OSError("timeout")), "unreachable")])
def test_live_page_never_overrides_approved_data(setup, fetch, status):
    run(setup, fetch=fetch)
    p = setup.get(Claim, ("stu1", "gsg-travel-award")).packet
    assert p["source_check"]["status"] == status
    assert "500" in p["catalog"]["benefit"]  # still the approved value
    assert setup.query(SourceCheck).filter_by(status=status).count() == 1


def test_agent_refuses_a_maybe(setup):
    setup.query(StudentFact).filter_by(field="gsg_fee_paid").delete()
    setup.commit()
    events = run(setup)
    assert "only runs when your card is a yes" in events[-1]["error"]
    assert setup.get(Claim, ("stu1", "gsg-travel-award")) is None


def test_agent_never_reads_pending_records(session):
    make_pending(session, eligibility=[])
    session.add(Student(id="stu1", needs=["conference"]))
    session.commit()
    events = list(claim_graph.run_claim(session, "stu1", "gsg-travel-award", None, fetch_ok, TODAY))
    assert "not approved" in events[-1]["error"]


def test_agents_have_no_send_tool():
    names = {t["name"] for t in navigator.tool_defs([{"id": "x"}], {"enrolled"})}
    graph_tools = {"get_profile", "get_resource", "fetch_source", "list_requirements", "draft_document",
                   "groundedness_check", "create_ics", "set_reminder"}
    for name in names | graph_tools:
        assert not any(w in name for w in ("send", "submit", "email", "post"))
    assert not any(hasattr(claim_tools, n) for n in ("send", "send_email", "submit"))


# --- grounding and dates ------------------------------------------------------------------

def test_template_draft_is_grounded_by_construction():
    r = {"id": "x", "title": "PURF", "provider": "Academic Programs", "evidence_quote": "q",
         "deadline": {"label": "due Tuesday, November 19, 2026, 11:59 pm"}, "benefit": {"label": "$1,000 stipend"}}
    facts = {"level": "undergrad", "gpa_band": "3_4_plus", "units_load": "full_time"}
    cat = grounding.build_catalog(r, facts, list(facts))
    d = grounding.template_draft(r, cat, facts, list(facts))
    assert grounding.check(d, cat)["passed"], grounding.check(d, cat)


def test_undocumented_is_never_written_into_a_draft():
    assert grounding.statements_for("communities", ["undocumented", "first_gen"]) == ["I am a first-generation college student."]


@pytest.mark.parametrize("label, expected", [
    ("Applications open Tuesday, October 20, 2026; due Tuesday, November 19, 2026, 11:59 pm", date(2026, 11, 19)),
    ("November 15, 2026", date(2026, 11, 15)),
    ("Rolling, apply before you travel", None),
    ("Fund applications are open September 9-30.", None),
    ("Opened July 1, 2026 and October 1, 2026", None),  # two dates, neither marked as due: ambiguous
    ("Due March 1, 2026", None),  # already passed
])
def test_deadline_dates_are_never_guessed(label, expected):
    assert claim_tools.deadline_date(label, TODAY) == expected


# --- HTTP ----------------------------------------------------------------------------------

def test_run_endpoint_streams_and_packet_and_calendar_are_served(setup, monkeypatch):
    monkeypatch.setattr(llm_mod, "get_llm", lambda: None)
    monkeypatch.setattr("unclaimed.agents.claim_graph.http_fetch", fetch_ok)
    with client.stream("GET", "/students/stu1/claims/gsg-travel-award/run") as r:
        body = "".join(r.iter_text())
    assert body.count("event: step") == 6 and "event: done" in body
    packet = client.get("/students/stu1/claims/gsg-travel-award").json()["packet"]
    assert packet["grounding"]["passed"]
    ics = client.get("/students/stu1/claims/gsg-travel-award/calendar.ics")
    assert ics.status_code == 200 and "DTSTART;VALUE=DATE:20261201" in ics.text
    assert client.post("/students/stu1/claims/gsg-travel-award/sent").json()["stage"] == "Sent"


# --- Navigator -------------------------------------------------------------------------------

def _block(**kw):
    return SimpleNamespace(**kw)


class FakeChat:
    model = "fake"

    def __init__(self, turns):
        self.turns = list(turns)

    def chat(self, system, messages, tools, effort="low"):
        return SimpleNamespace(content=self.turns.pop(0), stop_reason="tool_use")


def test_navigator_with_claude_updates_card_and_opens_ticket(setup):
    student = setup.get(Student, "stu1")
    student.needs = []
    setup.commit()
    fake = FakeChat([
        [_block(type="tool_use", id="t1", name="update_card", input={"add_needs": ["conference"], "remove_needs": [], "facts": []})],
        [_block(type="tool_use", id="t2", name="run_match", input={}), _block(type="tool_use", id="t3", name="open_ticket", input={"id": "gsg-travel-award"})],
        [_block(type="text", text="Added the conference. The GSG Travel Award is a yes for you.")],
    ])
    out = navigator.navigate(setup, student, "I'm presenting a poster in March", [], fake)
    assert out["mode"] == "claude" and out["ticket"] == "gsg-travel-award"
    assert out["tools"][0] == "update_card(+conference)" and out["tools"][1] == "run_match() -> 1 tickets"
    assert setup.get(Student, "stu1").needs == ["conference"]


def test_navigator_cannot_set_sensitive_fields(setup):
    student = setup.get(Student, "stu1")
    card = navigator.Card(setup, student)
    out = card.update_card([], [], [{"field": "citizenship", "value": "f1_j1"}])
    assert out["errors"] and setup.get(StudentFact, ("stu1", "citizenship")) is None
    schema = navigator.tool_defs(card.resources, card.askable | {"citizenship"})[0]["input_schema"]
    assert "citizenship" not in schema["properties"]["facts"]["items"]["properties"]["field"]["enum"]


def test_navigator_rules_fallback_maps_words_and_says_when_it_cannot(setup):
    student = setup.get(Student, "stu1")
    out = navigator.navigate(setup, student, "My landlord won't return my deposit", [], None)
    assert out["mode"] == "rules" and "housing" in setup.get(Student, "stu1").needs
    out = navigator.navigate(setup, student, "purple elephants", [], None)
    assert "couldn't map" in out["reply"]
    assert setup.query(AgentRun).filter_by(kind="navigator").count() == 2


def test_admin_lists_flagged_source_checks(setup):
    run(setup, fetch=fetch_changed)
    auth = ("owner", "test-password")
    assert "1 source page check to review" in client.get("/admin", auth=auth).text
    page = client.get("/admin/source-checks", auth=auth)
    assert "changed" in page.text and "gsg-travel-award" in page.text
    cid = setup.query(SourceCheck).one().id
    client.post(f"/admin/source-checks/{cid}/reviewed", auth=auth)
    assert "source page check" not in client.get("/admin", auth=auth).text
