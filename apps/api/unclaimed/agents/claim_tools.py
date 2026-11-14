"""Claim Agent tools. There is deliberately no tool that sends, submits or emails anything."""

import json
from datetime import date, datetime, timedelta, timezone

from unclaimed.agents import grounding
from unclaimed.agents.llm import LLM
from unclaimed.deadlines import parse_deadline
from unclaimed.rules import load_fields


def list_requirements(resource: dict, item: dict, facts: dict) -> list[dict]:
    """Everything to prepare or confirm, each tied to evidence. Per-item quotes are used when the
    record has them; otherwise the record-level quote stands (owner-verified record)."""
    fields = load_fields()
    record = {"evidence_quote": resource["evidence_quote"], "source_url": resource["source_url"]}
    out = []
    for s in resource.get("steps") or []:
        out.append({"kind": "step", "text": s["text"], "evidence_quote": s.get("evidence_quote") or record["evidence_quote"],
                    "evidence_level": "item" if s.get("evidence_quote") else "record", "source_url": record["source_url"]})
    for d in resource.get("docs") or []:
        out.append({"kind": "prepare", "text": d["text"], "evidence_quote": d.get("evidence_quote") or record["evidence_quote"],
                    "evidence_level": "item" if d.get("evidence_quote") else "record", "source_url": record["source_url"]})
    for t in item.get("office_decides") or []:
        out.append({"kind": "office", "text": f"The office checks: {t}", "evidence_quote": record["evidence_quote"],
                    "evidence_level": "record", "source_url": record["source_url"]})
    # Every self-reported fact the match relied on: the student confirms it is still true.
    for w in item.get("why") or []:
        f = w.get("field")
        if f and f in facts and f in fields:
            out.append({"kind": "confirm", "field": f,
                        "text": f"Confirm this is still true: {grounding._answer_label(fields[f], facts[f])} ({fields[f]['question']})",
                        "rule": w["text"], "self_reported": True, "office_verifies": bool(fields[f].get("office_verifies"))})
    if resource.get("deadline"):
        out.append({"kind": "deadline", "text": f"Timing: {resource['deadline']['label']}", "evidence_quote": record["evidence_quote"],
                    "evidence_level": "record", "source_url": record["source_url"]})
    return out


DRAFT_SYSTEM = """You draft a short, polite message that a USC student will review and send themselves to the office that runs a resource.

Rules (the draft is checked automatically and rejected if it breaks one):
- Every sentence lists the refs it relies on in "cites". Only use refs from the catalog.
- A sentence may only state facts found in the text of the refs it cites. Copy numbers, amounts and dates exactly as they appear in the cited text. Do not add facts, amounts, dates or requirements.
- Never say or imply the student is eligible, qualifies, or has been approved. The office decides that.
- A plain question to the office may have no cites, but must not state numbers.
- The greeting and closing are short and state no facts.
- 3 to 6 sentences. Plain, warm, first person, no bullet points.
- Mention a student fact only by citing its profile ref."""


def draft_schema(refs: list[str]) -> dict:
    return {
        "type": "object",
        "properties": {
            "subject": {"type": "string"},
            "greeting": {"type": "string"},
            "sentences": {"type": "array", "items": {
                "type": "object",
                "properties": {"text": {"type": "string"}, "cites": {"type": "array", "items": {"type": "string", "enum": refs}}},
                "required": ["text", "cites"], "additionalProperties": False}},
            "closing": {"type": "string"},
        },
        "required": ["subject", "greeting", "sentences", "closing"],
        "additionalProperties": False,
    }


def draft_document(llm: LLM, resource: dict, catalog: dict, requirements: list[dict], feedback: dict | None) -> dict:
    """Draft with Claude via structured output. `feedback` carries the previous draft and the
    groundedness issues to fix."""
    payload = {"resource_title": resource["title"], "catalog": catalog,
               "what_the_student_will_prepare": [r["text"] for r in requirements if r["kind"] in ("step", "prepare")]}
    user = "Draft the message from this catalog.\n\n" + json.dumps(payload, indent=1)
    if feedback:
        user += ("\n\nYour previous draft failed the groundedness check. Fix every issue and keep everything else.\n"
                 + json.dumps(feedback, indent=1))
    return llm.json(DRAFT_SYSTEM, user, draft_schema(sorted(catalog)), effort="medium")


def deadline_date(label: str | None, today: date) -> date | None:
    """The stated deadline, if it is still ahead. Never guessed (see unclaimed.deadlines)."""
    pick = parse_deadline(label)
    return pick if pick and pick >= today else None


def create_ics(resource: dict, when: date) -> str:
    stamp = datetime.now(timezone.utc).strftime("%Y%m%dT%H%M%SZ")
    title = resource["title"].replace(",", "\\,").replace(";", "\\;")
    return "\r\n".join([
        "BEGIN:VCALENDAR", "VERSION:2.0", "PRODID:-//Unclaimed//Claim Agent//EN", "BEGIN:VEVENT",
        f"UID:{resource['id']}-{when.isoformat()}@unclaimed", f"DTSTAMP:{stamp}",
        f"DTSTART;VALUE=DATE:{when.strftime('%Y%m%d')}", f"DTEND;VALUE=DATE:{(when + timedelta(days=1)).strftime('%Y%m%d')}",
        f"SUMMARY:Deadline: {title}", f"DESCRIPTION:Source: {resource['source_url']}", f"URL:{resource['source_url']}",
        "BEGIN:VALARM", "TRIGGER:-P3D", "ACTION:DISPLAY", f"DESCRIPTION:3 days left: {title}", "END:VALARM",
        "END:VEVENT", "END:VCALENDAR", "",
    ])


def set_reminder(resource: dict, when: date | None, today: date) -> dict:
    """A reminder stored in the packet. Shown in the app; nothing is sent anywhere."""
    if when:
        remind = max(today, when - timedelta(days=3))
        return {"date": remind.isoformat(), "text": f"Finish your {resource['title']} application. The deadline is {when.strftime('%B %-d, %Y')}."}
    return {"date": None, "text": "No deadline is published, so there is no reminder date. We'll ask you for the outcome a week after you send it."}
