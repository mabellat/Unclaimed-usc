"""Profile fields and structured eligibility criteria.

A criterion is either
  {"kind": "rule", "field", "op", "value", "text", ...}  evaluated by the matcher, or
  {"kind": "office", "text", ...}                         a judgment the office makes; shown, never evaluated.
Anything else is prose the matcher cannot evaluate, so it blocks approval.

In /admin each criterion is one line:
  level in masters, phd_or_other_grad :: registered graduate student
  office :: demonstrated financial need
"""

import json
from functools import cache

from unclaimed import DATA

FIELDS_FILE = DATA / "profile_fields.json"
RULES_FILE = DATA / "eligibility_rules.json"

OPS = {
    "bool": ("eq",),
    "enum": ("eq", "neq", "in", "not_in"),
    "multi": ("includes", "includes_any"),
}
LIST_OPS = {"in", "not_in", "includes_any"}
SEP = " :: "


@cache
def load_fields() -> dict[str, dict]:
    return json.loads(FIELDS_FILE.read_text())["fields"]


@cache
def load_rules() -> dict[str, dict]:
    return json.loads(RULES_FILE.read_text())["resources"]


def criterion_error(c: dict) -> str | None:
    """Why this criterion cannot go live, or None if it is a valid rule or office judgment."""
    text = (c.get("text") or "").strip()
    if not text:
        return "a criterion has no text"
    kind = c.get("kind")
    if kind == "office":
        return None
    if kind != "rule":
        return f'"{text}" is prose only; make it a rule or an office judgment'
    field = load_fields().get(c.get("field"))
    if field is None:
        return f'"{text}": unknown profile field {c.get("field")!r}'
    op, value = c.get("op"), c.get("value")
    if op not in OPS[field["type"]]:
        return f'"{text}": {c["field"]} cannot use op {op!r} (allowed: {", ".join(OPS[field["type"]])})'
    if field["type"] == "bool":
        return None if isinstance(value, bool) else f'"{text}": {c["field"]} needs true or false'
    values = value if op in LIST_OPS else [value]
    if not isinstance(values, list) or not values:
        return f'"{text}": {op} needs a list of values'
    bad = [v for v in values if v not in field["values"]]
    if bad:
        return f'"{text}": {c["field"]} has no value {", ".join(map(str, bad))} (allowed: {", ".join(field["values"])})'
    return None


def format_line(c: dict) -> str:
    """One criterion as an editable /admin line. Prose stays bare text."""
    text = c.get("text") or ""
    if c.get("kind") == "office":
        return f"office{SEP}{text}"
    if c.get("kind") != "rule":
        return text
    value = c.get("value")
    if isinstance(value, bool):
        shown = "true" if value else "false"
    elif isinstance(value, list):
        shown = ", ".join(value)
    else:
        shown = str(value)
    return f"{c.get('field')} {c.get('op')} {shown}{SEP}{text}"


def parse_line(line: str) -> dict:
    """Inverse of format_line. A line without ' :: ' is prose (kind None)."""
    if SEP not in line:
        return {"kind": None, "text": line.strip()}
    head, text = (part.strip() for part in line.split(SEP, 1))
    if head == "office":
        return {"kind": "office", "text": text}
    parts = head.split(None, 2)
    if len(parts) < 3:
        return {"kind": "rule", "field": parts[0] if parts else None, "op": None, "value": None, "text": text}
    field, op, raw = parts
    if raw in ("true", "false"):
        value = raw == "true"
    elif op in LIST_OPS:
        value = [v.strip() for v in raw.split(",") if v.strip()]
    else:
        value = raw.strip()
    return {"kind": "rule", "field": field, "op": op, "value": value, "text": text}


def fields_used(eligibilities: list[list[dict]]) -> set[str]:
    return {c["field"] for crit in eligibilities for c in crit if c.get("kind") == "rule"}
