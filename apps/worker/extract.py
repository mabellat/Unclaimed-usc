"""Read a page into a candidate record with the AI model (Gemini or Claude). Every value carries a quote, and a value
whose quote is not on the page verbatim is dropped (set to null). The LLM never decides
eligibility: eligibility text is only compared, never turned into rules."""

import json
import re

from unclaimed.agents.llm import LLM
from unclaimed.agents.sources import normalize

SCALARS = ("benefit_label", "benefit_value", "benefit_period", "deadline_label", "academic_year", "where", "note")

SYSTEM = """You read one USC web page and extract facts about one student resource into JSON.

Rules:
- Only extract what this page states. If the page does not state something, use null. Never infer, estimate or carry over dates.
- Every value needs a "quote": a short span copied character for character from the page that states it. A value without an exact quote is discarded.
- benefit_value is a single dollar amount as a number, only if the page states exactly one amount for the benefit; otherwise null.
- deadline_label: the next application window or deadline exactly as the page states it, including the year if given.
- When the page still says the same thing as the approved record, reuse the approved wording so unchanged facts do not look changed.
- eligibility: list each eligibility requirement the page states, as short plain text with its quote."""


def _nullable(t: str) -> dict:
    return {"anyOf": [{"type": t}, {"type": "null"}]}


def _item() -> dict:
    return {"type": "object", "additionalProperties": False, "required": ["text", "quote"],
            "properties": {"text": {"type": "string"}, "quote": {"type": "string"}}}


def schema() -> dict:
    scalar = lambda t: {"type": "object", "additionalProperties": False, "required": ["value", "quote"],
                        "properties": {"value": _nullable(t), "quote": _nullable("string")}}
    props = {f: scalar("number" if f == "benefit_value" else "string") for f in SCALARS}
    props |= {k: {"type": "array", "items": _item()} for k in ("steps", "docs", "eligibility")}
    return {"type": "object", "additionalProperties": False, "required": list(props), "properties": props}


def approved_view(r: dict) -> dict:
    return {"title": r["title"], "provider": r.get("provider"),
            "benefit_label": (r.get("benefit") or {}).get("label"), "benefit_value": (r.get("benefit") or {}).get("value"),
            "benefit_period": (r.get("benefit") or {}).get("period"), "deadline_label": (r.get("deadline") or {}).get("label"),
            "academic_year": r.get("academic_year"), "where": r.get("where"), "note": r.get("note"),
            "steps": [s["text"] for s in r.get("steps") or []], "docs": [d["text"] for d in r.get("docs") or []],
            "eligibility": [c["text"] for c in r.get("eligibility") or []]}


def extract(llm: LLM, page_text: str, url: str, approved: dict) -> dict:
    user = json.dumps({"page_url": url, "approved_record": approved_view(approved), "page_text": page_text}, indent=1)
    return llm.json(SYSTEM, "Extract the resource from this page.\n\n" + user, schema(), effort="medium")


def _on_page(quote: str | None, page: str) -> bool:
    return bool(quote) and normalize(quote) in page


def verify(candidate: dict, page_text: str) -> tuple[dict, list[str]]:
    """Keep only values whose quote is on the page verbatim. Returns (clean, dropped notes)."""
    page = normalize(page_text)
    clean, dropped = {}, []
    for f in SCALARS:
        v = candidate.get(f) or {}
        if v.get("value") is None:
            clean[f] = None
        elif not _on_page(v.get("quote"), page):
            clean[f] = None
            dropped.append(f"{f}: quote not found on the page")
        elif f == "benefit_value" and not re.search(rf"\$?{int(v['value']):,}|\$?{int(v['value'])}\b", v["quote"]):
            clean[f] = None
            dropped.append("benefit_value: the amount is not in its quote")
        else:
            clean[f] = {"value": v["value"], "quote": v["quote"]}
    for k in ("steps", "docs", "eligibility"):
        items = []
        for it in candidate.get(k) or []:
            if _on_page(it.get("quote"), page):
                items.append(it)
            else:
                dropped.append(f"{k}: '{it.get('text', '')[:60]}' quote not found on the page")
        clean[k] = items
    return clean, dropped
