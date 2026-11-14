"""The Claim Agent as a LangGraph graph:

  plan -> verify_source -> gather_requirements -> draft -> groundedness_check -> present_packet
                                                    ^               |
                                                    +---- fail -----+   (up to MAX_LLM_DRAFTS, then the template)

It reads approved data only, starts only for a "yes" match, and has no tool that sends anything.
Every node appends to the trace; the API streams the trace live and stores it in agent_runs.
"""

import operator
from datetime import date, datetime, timezone
from typing import Annotated, Any, Iterator, TypedDict
from urllib.parse import urlsplit

from langgraph.graph import END, START, StateGraph
from sqlalchemy.orm import Session

from unclaimed import match, repo
from unclaimed.agents import claim_tools, demo_cache, grounding
from unclaimed.agents.llm import LLM, LLMError
from unclaimed.agents.sources import check_source, http_fetch
from unclaimed.models import AgentRun, Claim, Student, StudentFact
from unclaimed.rules import fields_used

MAX_LLM_DRAFTS = 3

STEPS = [
    ("plan", "Plan the claim"),
    ("verify_source", "Verify the source page"),
    ("gather_requirements", "Work out what you need"),
    ("draft", "Draft your message"),
    ("groundedness_check", "Check every statement against the source"),
    ("present_packet", "Prepare your claim packet"),
]
LABELS = dict(STEPS)


class ClaimError(ValueError):
    pass


class State(TypedDict, total=False):
    student_id: str
    resource_id: str
    facts: dict
    resource: dict
    item: dict
    source: dict
    requirements: list
    catalog: dict
    why_fields: list
    draft: dict
    draft_mode: str
    attempts: int
    feedback: dict | None
    grounding: dict
    packet: dict
    trace: Annotated[list, operator.add]


def _event(node: str, tools: list[dict], result: str, **extra) -> dict:
    return {"node": node, "label": LABELS[node], "tools": tools, "result": result,
            "at": datetime.now(timezone.utc).isoformat(), **extra}


def plan_claim(session: Session, student_id: str, resource_id: str) -> dict:
    """Shared approval, relevance, eligibility and deadline gate for live and cached runs."""
    resources = [repo.public_dict(r) for r in repo.list_approved(session)]
    resource = next((r for r in resources if r["id"] == resource_id), None)
    if resource is None:
        raise ClaimError("this resource is not approved")
    askable = fields_used([r["eligibility"] for r in resources])
    rows = session.query(StudentFact).filter(StudentFact.student_id == student_id).all()
    facts = {f.field: f.value for f in rows if f.field in askable}
    student = session.get(Student, student_id)
    # The rules engine decides eligibility. The agent only starts on a "yes".
    own = fields_used([resource["eligibility"]])  # the matcher refuses facts no rule in its input uses
    result = match.run_match([resource], {f: v for f, v in facts.items() if f in own}, student.needs)
    item = next((m for m in result["yes"] if m["id"] == resource["id"]), None)
    if item is None:
        raise ClaimError("the claim agent only runs when your card is a yes for this resource")
    if (resource.get("deadline") or {}).get("closed"):
        raise ClaimError("this application window has closed, according to the source page")
    why_fields = [w["field"] for w in item["why"] if w.get("field")]
    return {"facts": facts, "resource": resource, "item": item, "why_fields": why_fields, "attempts": 0,
            "feedback": None, "trace": [_event("plan", [
                {"name": "get_profile", "summary": f"{len(facts)} answers on your card"},
                {"name": "get_resource", "summary": f"{resource['title']}, data version {resource['data_version']}"},
            ], f"Plan ready for the {resource['title']}: re-check the page, list what you need, draft, check.")]}


def build_graph(session: Session, llm: LLM | None, fetch=None, today: date | None = None, cache: dict | None = None):
    today = today or date.today()
    fetch = fetch or http_fetch  # looked up at call time, so tests can replace it

    def plan(state: State) -> dict:
        return plan_claim(session, state["student_id"], state["resource_id"])

    def verify_source(state: State) -> dict:
        r = state["resource"]
        source = check_source(session, r, fetch)
        msg = {
            "verified": "Page checked just now. It still matches the record a person approved.",
            "changed": "The page looks different from the approved record. We kept the approved version and flagged it for review.",
            "unreadable": "This page builds its text with JavaScript, so it couldn't be re-read automatically. Using the version a person approved.",
            "unreachable": "Couldn't reach the page just now. Using the version a person approved.",
            "blocked": "This source isn't on the allowlist, so it wasn't fetched.",
        }[source["status"]]
        return {"source": source, "trace": [_event("verify_source", [
            {"name": f"fetch_source({urlsplit(r['source_url']).hostname})", "summary": source["status"]}], msg,
            status=source["status"])]}

    def gather_requirements(state: State) -> dict:
        reqs = claim_tools.list_requirements(state["resource"], state["item"], state["facts"])
        catalog = grounding.build_catalog(state["resource"], state["facts"], state["why_fields"])
        n = sum(1 for x in reqs if x["kind"] in ("step", "prepare"))
        c = sum(1 for x in reqs if x["kind"] == "confirm")
        result = (f"{n} thing{'s' if n != 1 else ''} to prepare" if n else "Nothing extra to prepare") + \
                 (f", {c} answer{'s' if c != 1 else ''} to confirm." if c else ".")
        return {"requirements": reqs, "catalog": catalog, "trace": [_event("gather_requirements", [
            {"name": "list_requirements", "summary": f"{len(reqs)} items, each tied to the source"}], result)]}

    def draft(state: State) -> dict:
        attempts = state["attempts"] + 1
        use_llm = llm is not None and attempts <= MAX_LLM_DRAFTS
        note = None
        if use_llm:
            try:
                d = claim_tools.draft_document(llm, state["resource"], state["catalog"], state["requirements"], state["feedback"])
                mode = "claude"
            except LLMError as e:
                d, mode, note = None, "template", f"Claude was unavailable ({e}); used the template draft."
        else:
            d, mode = None, "template"
            if llm is not None:
                note = "Claude's drafts kept failing the check, so the template draft was used."
        if d is None and attempts == 1 and (cached := demo_cache.cached_draft(cache)) \
                and cache.get("data_version") == state["resource"]["data_version"]:
            # Demo fallback: the Claude draft cached for this persona and data version. It is checked again below.
            d, mode = cached, "claude-cached"
            note = (("Claude couldn't be reached" if llm is not None else "No Claude key on this machine")
                    + f", so this uses the Claude draft cached for this demo on {cache['cached_at'][:10]}.")
        if d is None:
            d = grounding.template_draft(state["resource"], state["catalog"], state["facts"], state["why_fields"])
        tool = "draft_document" + (f" (attempt {attempts})" if attempts > 1 else "")
        result = ("Draft written by Claude from your card and the source page." if mode == "claude"
                  else "Draft written from your card and the source page (template, no AI).")
        return {"draft": d, "draft_mode": mode, "attempts": attempts if mode in ("claude", "claude-cached") else MAX_LLM_DRAFTS + 1,
                "trace": [_event("draft", [{"name": tool, "summary": mode}], note or result, mode=mode)]}

    def groundedness_check(state: State) -> dict:
        g = grounding.check(state["draft"], state["catalog"])
        if not g["passed"] and state["draft_mode"] == "template":
            # The template is grounded by construction; if it fails, stop rather than show an unchecked draft.
            raise ClaimError("could not produce a draft that passes the groundedness check")
        result = (f"All {g['checked']} statements trace to the source page or your card." if g["passed"]
                  else f"{len(g['issues'])} problem{'s' if len(g['issues']) != 1 else ''} found. Redrafting.")
        # A cached draft that no longer fits is not retried: the next draft is the template.
        extra = {"attempts": MAX_LLM_DRAFTS} if not g["passed"] and state["draft_mode"] == "claude-cached" else {}
        return {**extra, "grounding": g, "feedback": None if g["passed"] else {"draft": state["draft"], "issues": g["issues"]},
                "trace": [_event("groundedness_check", [{"name": "groundedness_check", "summary": "pass" if g["passed"] else "fail"}],
                                 result, passed=g["passed"], issues=g["issues"])]}

    def route(state: State) -> str:
        return "present_packet" if state["grounding"]["passed"] else "draft"

    def present_packet(state: State) -> dict:
        r = state["resource"]
        when = claim_tools.deadline_date((r.get("deadline") or {}).get("label"), today)
        reminder = claim_tools.set_reminder(r, when, today)
        packet = {
            "resource_id": r["id"], "title": r["title"], "provider": r.get("provider"),
            "data_version": r["data_version"], "source_url": r["source_url"],
            "verified_at": datetime.now(timezone.utc).isoformat(), "source_check": state["source"],
            "checklist": state["requirements"],
            "draft": {**state["draft"], "text": grounding.render(state["draft"]), "mode": state["draft_mode"]},
            "catalog": state["catalog"], "grounding": state["grounding"],
            "deadline": {"label": (r.get("deadline") or {}).get("label"), "date": when.isoformat() if when else None},
            "has_calendar": when is not None, "reminder": reminder,
            "where": r.get("where"), "basis": state["item"].get("basis"),
            "sent_by_agent": False,  # the agent has no send tool; the student sends it
        }
        claim = session.get(Claim, (state["student_id"], r["id"]))
        if claim is None:
            claim = Claim(student_id=state["student_id"], resource_id=r["id"], stage="drafted")
            session.add(claim)
        claim.packet, claim.data_version = packet, r["data_version"]
        session.commit()
        tools = [{"name": "create_ics", "summary": when.isoformat()} if when else
                 {"name": "create_ics", "summary": "skipped: no date on the source page"},
                 {"name": "set_reminder", "summary": reminder["date"] or "no date"}]
        return {"packet": packet, "trace": [_event("present_packet", tools, "Your claim packet is ready. Review it, then send it yourself.")]}

    g = StateGraph(State)
    for name, fn in [("plan", plan), ("verify_source", verify_source), ("gather_requirements", gather_requirements),
                     ("draft", draft), ("groundedness_check", groundedness_check), ("present_packet", present_packet)]:
        g.add_node(name, fn)
    g.add_edge(START, "plan")
    g.add_edge("plan", "verify_source")
    g.add_edge("verify_source", "gather_requirements")
    g.add_edge("gather_requirements", "draft")
    g.add_edge("draft", "groundedness_check")
    g.add_conditional_edges("groundedness_check", route, {"present_packet": "present_packet", "draft": "draft"})
    g.add_edge("present_packet", END)
    return g.compile()


def run_claim(session: Session, student_id: str, resource_id: str, llm: LLM | None, fetch=None,
              today: date | None = None, cache: dict | None = None) -> Iterator[dict[str, Any]]:
    """Run the graph, yielding each trace event as it happens, then {"done": packet}.
    The run (inputs, every tool call, the output) is stored in agent_runs."""
    run = AgentRun(kind="claim", student_id=student_id, resource_id=resource_id, status="running",
                   mode="claude" if llm else "template", model=llm.model if llm else None,
                   inputs={"student_id": student_id, "resource_id": resource_id}, trace=[])
    session.add(run)
    session.commit()
    graph = build_graph(session, llm, fetch, today, cache)
    trace: list = []
    finished = False
    try:
        packet = None
        for update in graph.stream({"student_id": student_id, "resource_id": resource_id, "trace": []},
                                   stream_mode="updates", config={"recursion_limit": 20}):
            for node_out in update.values():
                for ev in node_out.get("trace", []):
                    trace.append(ev)
                    run.trace = list(trace)
                    session.commit()
                    yield {"event": ev}
                if "packet" in node_out:
                    packet = node_out["packet"]
        run.status, run.output = "done", {"packet_for": resource_id, "draft_mode": packet["draft"]["mode"] if packet else None}
        finished = True
        yield {"done": packet, "run_id": run.id}
    except ClaimError as e:
        run.status, run.output = "failed", {"error": str(e)}
        finished = True
        yield {"error": str(e), "run_id": run.id}
    except Exception as e:
        session.rollback()
        run.status, run.output = "failed", {"error": f"{type(e).__name__}: {e}"}
        finished = True
        yield {"error": "The claim agent hit an unexpected error. Nothing was sent.", "run_id": run.id}
    finally:
        if not finished:
            run.status = "stopped"  # the student pressed Stop (the stream was closed)
        run.finished_at = datetime.now(timezone.utc)
        session.commit()
