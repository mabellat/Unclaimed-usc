"""HTTP endpoints for the agents. The Claim Agent streams its trace as server-sent events."""

import json
from datetime import date

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import Response, StreamingResponse
from pydantic import BaseModel
from sqlalchemy.orm import Session

from unclaimed.agents import claim_tools
from unclaimed.agents import llm as llm_mod
from unclaimed.agents.claim_graph import STEPS, run_claim
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


@router.get("/students/{student_id}/claims/{resource_id}/run")
def run(student_id: str, resource_id: str):
    """Run the Claim Agent and stream each step. Closing the stream stops the run."""
    with SessionLocal() as s:
        _student(s, student_id)

    def stream():
        # Own session: the request-scoped one closes before a streamed body finishes.
        with SessionLocal() as session:
            llm = llm_mod.get_llm()
            yield _sse("start", {"mode": "claude" if llm else "template", "steps": [{"node": n, "label": l} for n, l in STEPS]})
            for item in run_claim(session, student_id, resource_id, llm):
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
