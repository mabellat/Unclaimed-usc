"""HTTP endpoints for the agents. The Claim Agent streams its trace as server-sent events."""

import json
import time
from datetime import date, datetime, timezone

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from unclaimed import repo
from unclaimed.agents import claim_tools, demo_cache
from unclaimed.agents import llm as llm_mod
from unclaimed.agents.claim_graph import STEPS, run_claim
from unclaimed.agents import navigator as nav
from unclaimed.agents.navigator import navigate
from unclaimed.db import SessionLocal, get_session
from unclaimed.models import AgentRun, Claim, Student

router = APIRouter()


def _student(session: Session, student_id: str) -> Student:
    s = session.get(Student, student_id)
    if s is None:
        raise HTTPException(404, "card not found")
    return s


@router.get("/agents/status")
def status():
    """Whether Claude is configured. Without it, agents use their labelled no-LLM paths."""
    return {"llm": llm_mod.has_credentials(), "model": llm_mod.MODEL, "claim_steps": [{"node": n, "label": l} for n, l in STEPS]}


def _sse(event: str, data) -> str:
    return f"event: {event}\ndata: {json.dumps(data)}\n\n"


def _replay(session: Session, student: Student, resource_id: str, cache: dict):
    """Replay a cached demo run step by step (UNCLAIMED_DEMO_REPLAY=1). Labelled as a replay."""
    run = AgentRun(kind="claim", student_id=student.id, resource_id=resource_id, status="running", mode="replay",
                   inputs={"student_id": student.id, "resource_id": resource_id, "replay_of": cache["cached_at"]}, trace=[])
    session.add(run)
    session.commit()
    for ev in cache["trace"]:
        time.sleep(0.6)
        yield _sse("step", ev | {"replayed": True})
    packet = cache["packet"] | {"replayed_from": cache["cached_at"]}
    claim = session.get(Claim, (student.id, resource_id)) or Claim(student_id=student.id, resource_id=resource_id, stage="drafted")
    claim.packet, claim.data_version = packet, cache["data_version"]
    session.add(claim)
    run.status, run.trace, run.output = "done", cache["trace"], {"replayed": True}
    run.finished_at = datetime.now(timezone.utc)
    session.commit()
    yield _sse("done", {"run_id": run.id})


@router.get("/students/{student_id}/claims/{resource_id}/run")
def run(student_id: str, resource_id: str):
    """Run the Claim Agent and stream each step. Closing the stream stops the run."""
    with SessionLocal() as s:
        _student(s, student_id)

    def stream():
        # Own session: the request-scoped one closes before a streamed body finishes.
        with SessionLocal() as session:
            student = session.get(Student, student_id)
            live = repo.get_approved(session, resource_id)
            cache = demo_cache.load(student.demo_persona, resource_id, live.data_version if live else None)
            steps = [{"node": n, "label": l} for n, l in STEPS]
            if cache and demo_cache.replay_enabled():
                yield _sse("start", {"mode": "replay", "cached_at": cache["cached_at"], "steps": steps})
                yield from _replay(session, student, resource_id, cache)
                return
            llm = llm_mod.get_llm()
            yield _sse("start", {"mode": "claude" if llm else "template", "steps": steps})
            for item in run_claim(session, student_id, resource_id, llm, cache=cache):
                if "event" in item:
                    yield _sse("step", item["event"])
                elif "done" in item:
                    yield _sse("done", {"run_id": item["run_id"]})
                else:
                    yield _sse("failed", {"error": item["error"], "run_id": item["run_id"]})

    return StreamingResponse(stream(), media_type="text/event-stream", headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"})


@router.get("/students/{student_id}/claims/{resource_id}")
def get_claim(student_id: str, resource_id: str, session: Session = Depends(get_session)):
    _student(session, student_id)
    c = session.get(Claim, (student_id, resource_id))
    if c is None or c.packet is None:
        raise HTTPException(404, "no claim packet yet")
    return {"resource_id": resource_id, "stage": c.stage, "sent_day": c.sent_day, "packet": c.packet}


@router.get("/students/{student_id}/claims/{resource_id}/calendar.ics")
def calendar(student_id: str, resource_id: str, session: Session = Depends(get_session)):
    c = session.get(Claim, (student_id, resource_id))
    if c is None or not c.packet or not c.packet.get("deadline", {}).get("date"):
        raise HTTPException(404, "no published deadline date for this claim")
    p = c.packet
    ics = claim_tools.create_ics({"id": resource_id, "title": p["title"], "source_url": p["source_url"]},
                                 date.fromisoformat(p["deadline"]["date"]))
    return Response(ics, media_type="text/calendar",
                    headers={"Content-Disposition": f'attachment; filename="{resource_id}-deadline.ics"'})


@router.get("/students/{student_id}/runs/{run_id}")
def get_run(student_id: str, run_id: int, session: Session = Depends(get_session)):
    r = session.get(AgentRun, run_id)
    if r is None or r.student_id != student_id:
        raise HTTPException(404, "run not found")
    return {"id": r.id, "kind": r.kind, "status": r.status, "mode": r.mode, "model": r.model, "inputs": r.inputs,
            "trace": r.trace, "output": r.output, "started_at": r.started_at.isoformat(),
            "finished_at": r.finished_at.isoformat() if r.finished_at else None}


class Turn(BaseModel):
    role: str
    text: str


class NavIn(BaseModel):
    message: str
    history: list[Turn] = []


@router.post("/students/{student_id}/navigator")
def navigator(student_id: str, body: NavIn, session: Session = Depends(get_session)):
    s = _student(session, student_id)
    if not body.message.strip():
        raise HTTPException(422, "say something first")
    history = [t.model_dump() for t in body.history if t.role in ("user", "assistant")]
    return navigate(session, s, body.message.strip()[:2000], history, llm_mod.get_llm())


@router.get("/students/{student_id}/explain/{resource_id}")
def explain(student_id: str, resource_id: str, session: Session = Depends(get_session)):
    """Why a resource is or isn't a match, in plain words, from the rules engine's own result.
    The same wording the Navigator uses without an LLM; every sentence is grounded in the approved
    record or the student's card."""
    card = nav.Card(session, _student(session, student_id))
    ex = card.explain(resource_id)
    if "error" in ex:
        raise HTTPException(404, ex["error"])
    plan = {"resource_ids": [resource_id]}
    acted = {"explain": {resource_id: ex}}
    cat = nav.facts_pack(card, "why_not", plan, acted)
    sentences = nav.template_answer("why_not", plan, acted, cat)
    return {"status": ex["status"], "relevant": ex["relevant"], "sentences": [s["text"] for s in sentences]}
