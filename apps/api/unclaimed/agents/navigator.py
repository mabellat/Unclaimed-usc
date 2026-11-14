"""The Navigator: maps the student's plain words to their card through tools.

Tools: update_card, run_match, get_resource, open_ticket. Sensitive fields are not in
update_card's schema at all, so the model cannot set them; it can only point the student
to My card. Without an LLM, a labelled keyword fallback handles common situations.
"""

import json
import re
from datetime import datetime, timezone

from sqlalchemy.orm import Session

from unclaimed import match, repo
from unclaimed.agents.llm import LLM, LLMError
from unclaimed.models import AgentRun, Student, StudentFact
from unclaimed.rules import fields_used, load_fields
from unclaimed.vocab import NEEDS

MAX_TURNS = 6
NEED_WORDS = {
    "money": "money is tight, bills, rent money, emergencies", "conference": "presenting or attending a conference",
    "research": "doing research, a lab, a thesis", "job": "job or internship hunt, resume, interviews",
    "housing": "landlord, lease, deposit, eviction", "legal": "needs legal advice", "international": "international student, visa paperwork, work authorization",
    "caregiver": "caring for a child or dependent", "food": "groceries, meals, hunger", "wellbeing": "stress, mental or physical health",
    "accessibility": "disability or accommodations", "academics": "help with classes or writing", "transport": "getting around, bus, rides",
    "community": "looking for community (first-gen, transfer and similar centers)",
}
SYSTEM = """You are the Navigator inside Unclaimed, an app that matches USC students to funds and services a person has approved.
The student tells you what's going on in plain words. Map it to their card with tools, then reply.

How to work:
- Use update_card to add needs that clearly fit what they said, and facts only when they state them outright (e.g. "I'm a master's student"). Never guess a fact.
- Some topics are sensitive (citizenship or visa status, Social Security number, financial aid, communities like first-gen or veteran). You cannot set these. If the student mentions one, say they can add it on My card, where we explain why we ask.
- After changing the card, call run_match and describe what changed using only its results. A "maybe" is not a yes; say what it still needs.
- Use open_ticket when one resource clearly fits, so the app can show a button.
- The rules engine decides eligibility, not you. Never say someone qualifies unless run_match lists it as yes, and never promise an outcome.
- If you can't map the message to anything, say so and suggest two short examples like "My landlord won't return my deposit" or "I'm going to a conference in March".
- Reply in 1 to 3 short sentences. Nothing is ever sent on the student's behalf."""


def _fields_for_chat(askable: set[str]) -> dict:
    return {f: spec for f, spec in load_fields().items() if f in askable and not spec.get("sensitive")}


def tool_defs(resources: list[dict], askable: set[str]) -> list[dict]:
    fields = _fields_for_chat(askable)
    return [
        {"name": "update_card", "strict": True,
         "description": "Add or remove needs on the student's card, and record facts the student stated outright. "
                        "Fact values are strings: 'true'/'false' for yes-no fields, one allowed value for choice fields, "
                        "comma-separated allowed values for pick-many fields. Allowed fields and values: "
                        + json.dumps({f: {"question": s["question"], "values": s.get("values", ["true", "false"])} for f, s in fields.items()}),
         "input_schema": {"type": "object", "additionalProperties": False, "required": ["add_needs", "remove_needs", "facts"], "properties": {
             "add_needs": {"type": "array", "items": {"type": "string", "enum": list(NEEDS)}},
             "remove_needs": {"type": "array", "items": {"type": "string", "enum": list(NEEDS)}},
             "facts": {"type": "array", "items": {"type": "object", "additionalProperties": False, "required": ["field", "value"], "properties": {
                 "field": {"type": "string", "enum": sorted(fields) or ["enrolled"]}, "value": {"type": "string"}}}},
         }}},
        {"name": "run_match", "strict": True, "description": "Re-run the rules engine on the current card. Returns yes and maybe results.",
         "input_schema": {"type": "object", "additionalProperties": False, "properties": {}, "required": []}},
        {"name": "get_resource", "strict": True, "description": "Read one approved resource.",
         "input_schema": {"type": "object", "additionalProperties": False, "required": ["id"],
                          "properties": {"id": {"type": "string", "enum": [r["id"] for r in resources]}}}},
        {"name": "open_ticket", "strict": True, "description": "Show the student a button that opens this resource's ticket.",
         "input_schema": {"type": "object", "additionalProperties": False, "required": ["id"],
                          "properties": {"id": {"type": "string", "enum": [r["id"] for r in resources]}}}},
    ]


def parse_value(spec: dict, raw: str):
    raw = raw.strip()
    if spec["type"] == "bool":
        if raw.lower() not in ("true", "false"):
            raise ValueError("use 'true' or 'false'")
        return raw.lower() == "true"
    if spec["type"] == "multi":
        return [v.strip() for v in raw.split(",") if v.strip()]
    return raw


class Card:
    """The student's card plus the tool implementations, all against the database."""

    def __init__(self, session: Session, student: Student):
        self.session, self.student = session, student
        self.resources = [repo.public_dict(r) for r in repo.list_approved(session)]
        self.by_id = {r["id"]: r for r in self.resources}
        self.askable = fields_used([r["eligibility"] for r in self.resources])
        self.ticket: str | None = None

    def facts(self) -> dict:
        rows = self.session.query(StudentFact).filter(StudentFact.student_id == self.student.id).all()
        return {f.field: f.value for f in rows if f.field in self.askable}

    def match(self) -> dict:
        return match.run_match(self.resources, self.facts(), self.student.needs)

    def update_card(self, add_needs: list[str], remove_needs: list[str], facts: list[dict]) -> dict:
        fields = _fields_for_chat(self.askable)
        errors, saved = [], {}
        for item in facts:
            f = item["field"]
            if f not in fields:
                errors.append(f"{f}: can't be set from chat")
                continue
            try:
                value = parse_value(fields[f], item["value"])
            except ValueError as e:
                errors.append(f"{f}: {e}")
                continue
            if err := match.value_error(f, value):
                errors.append(err)
                continue
            row = self.session.get(StudentFact, (self.student.id, f))
            if row is None:
                self.session.add(StudentFact(student_id=self.student.id, field=f, value=value, source="student"))
            else:
                row.value = value
            saved[f] = value
        needs = (set(self.student.needs) | set(add_needs)) - set(remove_needs)
        self.student.needs = sorted(n for n in needs if n in NEEDS)
        self.session.commit()
        return {"needs": self.student.needs, "facts_saved": saved, "errors": errors}

    def run_match(self) -> dict:
        m = self.match()
        return {"yes": [{"id": x["id"], "title": self.by_id[x["id"]]["title"]} for x in m["yes"]],
                "maybe": [{"id": x["id"], "title": self.by_id[x["id"]]["title"], "needs_answers_for": x["unknown"]} for x in m["maybe"]]}

    def get_resource(self, id: str) -> dict:
        r = self.by_id.get(id)
        if not r:
            return {"error": "not an approved resource"}
        return {k: r.get(k) for k in ("id", "title", "provider", "category", "benefit", "deadline", "where", "note", "source_url")}

    def open_ticket(self, id: str) -> dict:
        if id not in self.by_id:
            return {"error": "not an approved resource"}
        self.ticket = id
        return {"ok": True}


def _chip(name: str, args: dict, out: dict) -> str:
    if name == "update_card":
        parts = [f"+{n}" for n in args.get("add_needs", [])] + [f"-{n}" for n in args.get("remove_needs", [])]
        parts += [f"{f['field']}={f['value']}" for f in args.get("facts", [])]
        return f"update_card({', '.join(parts)})"
    if name == "run_match":
        return f"run_match() -> {len(out.get('yes', []))} tickets"
    return f"{name}({args.get('id', '')})"


def chat_with_claude(llm: LLM, card: Card, history: list[dict], message: str) -> dict:
    messages = [{"role": h["role"], "content": h["text"]} for h in history[-10:] if h.get("text")]
    messages.append({"role": "user", "content": message})
    tools = tool_defs(card.resources, card.askable)
    chips, trace = [], []
    for _ in range(MAX_TURNS):
        response = llm.chat(SYSTEM, messages, tools)
        uses = [b for b in response.content if b.type == "tool_use"]
        if not uses:
            reply = " ".join(b.text for b in response.content if b.type == "text").strip()
            return {"reply": reply or "Done.", "tools": chips, "trace": trace}
        messages.append({"role": "assistant", "content": response.content})
        results = []
        for b in uses:
            fn = getattr(card, b.name, None)
            try:
                out = fn(**b.input) if fn and b.name in ("update_card", "run_match", "get_resource", "open_ticket") else {"error": "unknown tool"}
                is_error = "error" in out
            except Exception as e:  # bad arguments: report back to the model
                out, is_error = {"error": str(e)}, True
            chips.append(_chip(b.name, b.input, out))
            trace.append({"tool": b.name, "input": b.input, "output": out})
            results.append({"type": "tool_result", "tool_use_id": b.id, "content": json.dumps(out), "is_error": is_error})
        messages.append({"role": "user", "content": results})
    return {"reply": "I updated what I could. Check your wallet for the latest matches.", "tools": chips, "trace": trace}


# --- no-LLM fallback --------------------------------------------------------------------

PATTERNS = {
    "money": r"money|broke|afford|expensive|tight|loan|emergenc|bills",
    "conference": r"conference|poster|symposium",
    "research": r"research|\blab\b|thesis|fellowship",
    "caregiver": r"\bkids?\b|child|daughter|\bson\b|baby|toddler|caregiv|caretak",
    "housing": r"landlord|lease|deposit|evict|housing|apartment|rent\b",
    "legal": r"legal|lawyer|sued|attorney",
    "international": r"international|visa|f-1|\bf1\b|\bopt\b|\bcpt\b",
    "job": r"internship|\bjobs?\b|resume|interview|career|recruit",
    "food": r"\bfood|groceries|hungry|\bmeals?\b",
    "wellbeing": r"stress|anxious|anxiety|depress|therap|counsel|sick|health",
    "accessibility": r"disabilit|accommodat|adhd|dyslex",
    "academics": r"tutor|writing|essay|class(es)?\b|homework",
    "transport": r"\bbus\b|metro|ride|commute|transport",
    "laptop": r"laptop|computer",
}
LEVELS = [("undergrad", r"undergrad|freshman|sophomore|junior|senior|bachelor"),
          ("phd_or_other_grad", r"\bphd\b|doctoral"), ("masters", r"master")]


def chat_with_rules(card: Card, message: str) -> dict:
    t = message.lower()
    found = [n for n, p in PATTERNS.items() if n != "laptop" and re.search(p, t)]
    level = next((v for v, p in LEVELS if re.search(p, t)), None)
    before = {x["id"] for x in card.match()["yes"]}
    chips, trace = [], []
    if found or level:
        facts = [{"field": "level", "value": level}] if level and "level" in card.askable else []
        args = {"add_needs": found, "remove_needs": [], "facts": facts}
        out = card.update_card(**args)
        chips.append(_chip("update_card", args, out))
        after = card.run_match()
        chips.append(_chip("run_match", {}, after))
        trace += [{"tool": "update_card", "input": args, "output": out}, {"tool": "run_match", "input": {}, "output": after}]
        fresh = [x for x in after["yes"] if x["id"] not in before]
        if fresh:
            card.ticket = fresh[0]["id"]
            reply = f"Got it. I updated your card. New: {', '.join(x['title'] for x in fresh[:3])}."
        else:
            reply = "Got it. I updated your card. Nothing new is a yes yet; check Might be yours in your wallet."
    elif re.search(PATTERNS["laptop"], t) and "its-laptop-loaner" in card.by_id:
        card.ticket = "its-laptop-loaner"
        chips.append("open_ticket(its-laptop-loaner)")
        reply = "The ITS Laptop Loaner Program is listed for enrolled students. Open the ticket to see how it works."
    else:
        reply = ("I couldn't map that to a situation yet. Try something like “My landlord won't return my deposit” "
                 "or “I'm going to a conference in March”.")
    return {"reply": reply, "tools": chips, "trace": trace}


def navigate(session: Session, student: Student, message: str, history: list[dict], llm: LLM | None) -> dict:
    card = Card(session, student)
    run = AgentRun(kind="navigator", student_id=student.id, status="running", mode="claude" if llm else "rules",
                   model=llm.model if llm else None, inputs={"message": message, "history_turns": len(history)}, trace=[])
    session.add(run)
    session.commit()
    mode = "claude"
    try:
        if llm is None:
            raise LLMError("no LLM configured")
        out = chat_with_claude(llm, card, history, message)
    except LLMError:
        mode = "rules"
        out = chat_with_rules(card, message)
    run.mode, run.trace, run.status = mode, out["trace"], "done"
    run.output = {"reply": out["reply"], "ticket": card.ticket}
    run.finished_at = datetime.now(timezone.utc)
    session.commit()
    return {"reply": out["reply"], "tools": out["tools"], "ticket": card.ticket, "mode": mode, "run_id": run.id}
