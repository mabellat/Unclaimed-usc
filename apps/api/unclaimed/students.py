"""The student's card (pseudonymous), their answers, matches, claims and alerts.

Answers are self-reported and tri-state: a missing row is unknown. Only fields used by an
approved rule can be stored (non-negotiable 4). Nothing here sends anything anywhere.
Claim stages after "sent" and all alerts here are SIMULATED from the demo clock.
"""

import json
import secrets
from datetime import datetime, timezone
from typing import Any

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel
from sqlalchemy import delete, select
from sqlalchemy.orm import Session

from unclaimed import DATA, match, repo
from unclaimed.db import get_session
from unclaimed.followup import followup_text
from unclaimed.models import Claim, ResourceChange, Student, StudentFact
from unclaimed.rules import fields_used, load_fields
from unclaimed.vocab import NEEDS

router = APIRouter()
DEMO_DAYS = (1, 7, 30)
STAGES = ("Drafted", "Sent", "In review", "Received")


# --- profile fields ---------------------------------------------------------------------

def _approved(session: Session) -> list[dict]:
    return [repo.public_dict(r) for r in repo.list_approved(session)]


def _askable(resources: list[dict]) -> set[str]:
    return fields_used([r["eligibility"] for r in resources])


@router.get("/profile/fields")
def profile_fields(session: Session = Depends(get_session)):
    """Questions the app may ask: only fields that an approved rule uses."""
    askable = _askable(_approved(session))
    return {"fields": {name: spec for name, spec in load_fields().items() if name in askable}}


# --- the card ---------------------------------------------------------------------------

def _student(session: Session, student_id: str) -> Student:
    s = session.get(Student, student_id)
    if s is None:
        raise HTTPException(404, "card not found")
    return s


def _facts(session: Session, student_id: str) -> dict[str, Any]:
    rows = session.scalars(select(StudentFact).where(StudentFact.student_id == student_id))
    return {f.field: f.value for f in rows}


def _card(session: Session, s: Student) -> dict:
    return {"id": s.id, "needs": sorted(s.needs), "facts": _facts(session, s.id), "demo_day": s.demo_day,
            "source": "student"}


def _check_needs(needs: list[str]) -> list[str]:
    if bad := sorted(set(needs) - set(NEEDS)):
        raise HTTPException(422, f"unknown needs: {', '.join(bad)}")
    return sorted(set(needs))


def _check_fact(session: Session, field: str, value) -> None:
    if err := match.value_error(field, value):
        raise HTTPException(422, err)
    if field not in _askable(_approved(session)):
        raise HTTPException(422, f"no approved rule uses {field}")


def _put_fact(session: Session, student_id: str, field: str, value) -> None:
    row = session.get(StudentFact, (student_id, field))
    if row is None:
        session.add(StudentFact(student_id=student_id, field=field, value=value, source="student"))
    else:
        row.value = value


class CardIn(BaseModel):
    facts: dict[str, Any] = {}
    needs: list[str] = []
    persona: str | None = None  # a demo persona id; the card is otherwise a normal card


@router.post("/students", status_code=201)
def create_student(body: CardIn | None = None, session: Session = Depends(get_session)):
    body = body or CardIn()
    if body.persona and body.persona not in {p["id"] for p in load_personas()}:
        raise HTTPException(422, "unknown demo persona")
    s = Student(id=secrets.token_urlsafe(9), needs=_check_needs(body.needs), demo_day=1, demo_persona=body.persona)
    session.add(s)
    session.flush()
    for field, value in body.facts.items():
        if value is None:
            continue  # null means unknown: store nothing
        _check_fact(session, field, value)
        _put_fact(session, s.id, field, value)
    session.commit()
    return _card(session, s)


@router.get("/students/{student_id}")
def get_student(student_id: str, session: Session = Depends(get_session)):
    return _card(session, _student(session, student_id))


@router.delete("/students/{student_id}", status_code=204)
def delete_student(student_id: str, session: Session = Depends(get_session)):
    session.delete(_student(session, student_id))
    session.commit()


class NeedsIn(BaseModel):
    needs: list[str]


@router.put("/students/{student_id}/needs")
def set_needs(student_id: str, body: NeedsIn, session: Session = Depends(get_session)):
    s = _student(session, student_id)
    s.needs = _check_needs(body.needs)
    session.commit()
    return _card(session, s)


class FactIn(BaseModel):
    value: Any


@router.put("/students/{student_id}/facts/{field}")
def set_fact(student_id: str, field: str, body: FactIn, session: Session = Depends(get_session)):
    s = _student(session, student_id)
    if body.value is None:
        raise HTTPException(422, "to forget an answer, delete it; unknown is never stored")
    _check_fact(session, field, body.value)
    _put_fact(session, s.id, field, body.value)
    session.commit()
    return _card(session, s)


@router.delete("/students/{student_id}/facts/{field}")
def forget_fact(student_id: str, field: str, session: Session = Depends(get_session)):
    s = _student(session, student_id)
    session.execute(delete(StudentFact).where(StudentFact.student_id == s.id, StudentFact.field == field))
    session.commit()
    return _card(session, s)


# --- matching ---------------------------------------------------------------------------

def _match(session: Session, s: Student, skip: list[str]) -> dict:
    resources = _approved(session)
    facts = _facts(session, s.id)
    askable = _askable(resources)
    # A stored answer whose rule was later removed is ignored, never used to match.
    return match.run_match(resources, {f: v for f, v in facts.items() if f in askable}, s.needs, skip=skip)


@router.get("/students/{student_id}/match")
def student_match(student_id: str, skip: str = "", session: Session = Depends(get_session)):
    s = _student(session, student_id)
    return _match(session, s, [f for f in skip.split(",") if f])


# --- claims (stages after "sent" are SIMULATED unless the student reports the outcome) ----

OUTCOMES = {"received": (3, "Received"), "denied": (3, "Not approved"), "waiting": (None, None)}
FIELD_NAMES = {"title": "Name", "provider": "Office", "benefit_label": "Benefit", "benefit_value": "Amount",
               "benefit_period": "Period", "eligibility": "Who can apply", "deadline_label": "Deadline",
               "academic_year": "Academic year", "where": "Where", "steps": "Steps", "docs": "Documents",
               "note": "Heads up", "conflicts": "Pages that disagree"}


def stage_index(claim: Claim, day: int) -> int:
    if claim.stage == "drafted":
        return 0
    if claim.outcome in ("received", "denied"):
        return 3
    elapsed = day - (claim.sent_day or day)
    return 3 if elapsed >= 20 else 2 if elapsed >= 5 else 1


def _claim_dict(c: Claim, day: int, resource: dict | None) -> dict:
    idx = stage_index(c, day)
    reported = c.outcome in ("received", "denied")
    stage = OUTCOMES[c.outcome][1] if reported else STAGES[idx]
    return {"resource_id": c.resource_id, "title": resource["title"] if resource else c.resource_id,
            "value": _value(resource), "stage": stage, "stage_index": idx, "sent_day": c.sent_day,
            "outcome": c.outcome, "followup": c.followup,
            "simulated": idx >= 2 and not reported, "data_version": c.data_version, "has_packet": c.packet is not None}


def _claims(session: Session, s: Student) -> list[Claim]:
    return list(session.scalars(select(Claim).where(Claim.student_id == s.id).order_by(Claim.created_at)))


@router.get("/students/{student_id}/claims")
def list_claims(student_id: str, session: Session = Depends(get_session)):
    s = _student(session, student_id)
    by_id = {r["id"]: r for r in _approved(session)}
    return {"demo_day": s.demo_day, "simulated": True,
            "claims": [_claim_dict(c, s.demo_day, by_id.get(c.resource_id)) for c in _claims(session, s)]}


def _own_claim(session: Session, s: Student, resource_id: str) -> Claim:
    c = session.get(Claim, (s.id, resource_id))
    if c is None:
        raise HTTPException(404, "no claim for this resource")
    return c


@router.post("/students/{student_id}/claims/{resource_id}/sent")
def mark_sent(student_id: str, resource_id: str, session: Session = Depends(get_session)):
    """The student says they sent it themselves. The app never sends anything."""
    s = _student(session, student_id)
    c = _own_claim(session, s, resource_id)
    c.stage, c.sent_day, c.sent_at = "sent", s.demo_day, datetime.now(timezone.utc)
    session.commit()
    return _claim_dict(c, s.demo_day, next((r for r in _approved(session) if r["id"] == resource_id), None))


class OutcomeIn(BaseModel):
    outcome: str


@router.post("/students/{student_id}/claims/{resource_id}/outcome")
def report_outcome(student_id: str, resource_id: str, body: OutcomeIn, session: Session = Depends(get_session)):
    """Only USC offices see decisions, so the student tells us what happened."""
    if body.outcome not in OUTCOMES:
        raise HTTPException(422, "outcome must be received, denied or waiting")
    s = _student(session, student_id)
    c = _own_claim(session, s, resource_id)
    if c.stage != "sent":
        raise HTTPException(422, "send it first")
    c.outcome, c.outcome_at = body.outcome, datetime.now(timezone.utc)
    session.commit()
    return _claim_dict(c, s.demo_day, next((r for r in _approved(session) if r["id"] == resource_id), None))


class ClockIn(BaseModel):
    day: int


@router.put("/students/{student_id}/clock")
def set_clock(student_id: str, body: ClockIn, session: Session = Depends(get_session)):
    """SIMULATED demo clock. Only USC offices see real decisions."""
    if body.day not in DEMO_DAYS:
        raise HTTPException(422, "day must be 1, 7 or 30")
    s = _student(session, student_id)
    s.demo_day = body.day
    session.commit()
    return {"demo_day": s.demo_day}


# --- alerts ------------------------------------------------------------------------------
# Real alerts come only from approved data: approved changes (resource_changes), pages that
# disagree (approved conflicts) and Watcher follow-ups. Day-based ones are SIMULATED.

def _money(n) -> str:
    return f"${n:,.0f}"


def _show(field: str, v) -> str:
    if v is None or v == []:
        return "(none)"
    if field == "benefit_value":
        return _money(v)
    if field in ("steps", "docs", "eligibility"):
        return "; ".join(i.get("text", "") for i in v)
    if field == "conflicts":
        return "; ".join(f"{c['field']}: " + " vs ".join(str(x["value"]) for x in c["versions"]) for c in v)
    return str(v)


def _real_alerts(session: Session, s: Student, result: dict, by_id: dict, claims: list[Claim]) -> list[dict]:
    mine = {m["id"] for m in result["yes"] + result["maybe"]} | {c.resource_id for c in claims}
    out = []
    changes = session.scalars(select(ResourceChange).where(ResourceChange.resource_id.in_(mine))
                              .order_by(ResourceChange.approved_at)).all()
    for ch in changes:
        if ch.approved_at < s.created_at:
            continue  # the student's card was built on the new version already
        r = by_id.get(ch.resource_id, {})
        out.append({"key": f"change-{ch.id}", "date": ch.approved_at.isoformat(), "tag": "UPDATED", "tone": "cardinal",
                    "title": f"{r.get('title', ch.resource_id)} changed",
                    "body": "We re-read the source page and a person approved this update.",
                    "diff": [{"field": FIELD_NAMES.get(x["field"], x["field"]), "old": _show(x["field"], x["old"]),
                              "new": _show(x["field"], x["new"])} for x in ch.changes],
                    "resource_id": ch.resource_id, "cta": "Open the ticket", "simulated": False})
    for rid in sorted(mine):
        r = by_id.get(rid)
        for conflict in (r or {}).get("conflicts") or []:
            out.append({"key": f"conflict-{rid}-{conflict['field']}-{r['data_version']}", "tag": "TWO VERSIONS", "tone": "gold",
                        "title": f"USC pages disagree about the {r['title']}",
                        "body": f"{FIELD_NAMES.get(conflict['field'], conflict['field'])}: the pages say different things. Check with the office.",
                        "versions": conflict["versions"], "resource_id": rid, "cta": "Open the ticket", "simulated": False})
    for c in claims:
        if c.followup and not c.outcome:
            title = by_id.get(c.resource_id, {}).get("title", c.resource_id)
            out.append({"key": f"followup-{c.resource_id}", "date": c.followup["drafted_at"], "tag": "FOLLOW-UP", "tone": "gold",
                        "title": f"No reply yet on the {title}",
                        "body": "It's been over a week since you sent it. Here is a polite check-in you can send yourself. Did you hear back?",
                        "quote": c.followup["text"], "resource_id": c.resource_id, "ask_outcome": True, "simulated": False})
    return out


@router.get("/students/{student_id}/alerts")
def alerts(student_id: str, session: Session = Depends(get_session)):
    s = _student(session, student_id)
    day = s.demo_day
    result = _match(session, s, [])
    by_id = {r["id"]: r for r in _approved(session)}
    claims = _claims(session, s)
    total = sum(_value(by_id.get(m["id"])) or 0 for m in result["yes"] if not _closed(by_id.get(m["id"])))
    out = [{"key": "welcome", "day": 1, "tag": "WELCOME", "tone": "ink", "title": "Your wallet is ready",
            "body": f"{len(result['yes'])} tickets matched your Trojan card"
                    + (f", worth up to {_money(total)} in cash." if total else "."),
            "resource_id": None, "simulated": False}]
    out += _real_alerts(session, s, result, by_id, claims)
    real_followups = {a["resource_id"] for a in out if a["tag"] == "FOLLOW-UP"}
    if day >= 7:
        for c in claims:
            title = by_id.get(c.resource_id, {}).get("title", c.resource_id)
            idx = stage_index(c, day)
            if idx == 0:
                out.append({"key": f"remind-{c.resource_id}", "day": 7, "tag": "REMINDER", "tone": "gold", "title": f"You haven't sent the {title} yet",
                            "body": "You drafted it, then life happened. It takes about two minutes to finish.",
                            "resource_id": c.resource_id, "cta": "Open the ticket", "simulated": True})
            elif idx in (1, 2) and not c.outcome and c.resource_id not in real_followups:
                out.append({"key": f"demo-followup-{c.resource_id}-{day}", "day": 7, "tag": "FOLLOW-UP", "tone": "gold", "title": f"No reply yet on the {title}",
                            "body": f"It's been {day - c.sent_day} days since you sent it. Here is a polite check-in you can send yourself. Did you hear back?",
                            "quote": followup_text(title), "resource_id": c.resource_id, "ask_outcome": True, "simulated": True})
    if day >= 30:
        for c in claims:
            if stage_index(c, day) == 3 and c.outcome != "denied":
                title = by_id.get(c.resource_id, {}).get("title", c.resource_id)
                value = _value(by_id.get(c.resource_id))
                out.append({"key": f"received-{c.resource_id}", "day": 30, "tag": "RECEIVED", "tone": "green", "title": f"{title} came through",
                            "body": f"Up to {_money(value)} is on its way to you." if value else "You're all set.",
                            "resource_id": c.resource_id, "simulated": c.outcome != "received"})
        out.append({"key": "new-term", "day": 30, "tag": "NEW TERM", "tone": "ink", "title": "A new semester is starting",
                    "body": "New terms bring new situations. Update your Trojan card to catch matches you didn't qualify for last time.",
                    "resource_id": None, "cta": "Update my card", "go": "card", "simulated": True})
    return {"demo_day": day, "alerts": list(reversed(out))}


def _closed(resource: dict | None) -> bool:
    return bool(((resource or {}).get("deadline") or {}).get("closed"))


def _value(resource: dict | None) -> float | None:
    return ((resource or {}).get("benefit") or {}).get("value")


# --- demo -------------------------------------------------------------------------------

def load_personas() -> list[dict]:
    return json.loads((DATA / "demo_personas.json").read_text())["personas"]


@router.get("/demo/personas")
def demo_personas():
    """Demo students. Loading one creates a normal card through POST /students."""
    return {"personas": [{k: p.get(k) for k in ("id", "name", "summary", "facts", "needs", "moment")} for p in load_personas()]}
