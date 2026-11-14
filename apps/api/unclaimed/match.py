"""The rules engine. Pure functions over approved resources (public_dict shape) and a profile.

Semantics (CLAUDE.md "Matching semantics"):
  relevance  non-empty and none of those needs selected -> not shown
  eligibility  any rule known and failing -> no; else any rule unknown -> maybe; else yes
Office judgments are listed, never evaluated, and never block a yes. A criterion the
matcher cannot read (prose) counts as unknown, so it can never produce a yes.
A missing fact is unknown, never false.
"""

from decimal import Decimal

from unclaimed.rules import fields_used, load_fields

# Needs that imply other needs (CLAUDE.md: housing implies legal).
IMPLIED_NEEDS = {"housing": {"legal"}}
SELF_REPORTED = "Based on what you told us. The office will confirm."


class ProfileError(ValueError):
    pass


def expand_needs(needs) -> set[str]:
    out = set(needs)
    for need in list(out):
        out |= IMPLIED_NEEDS.get(need, set())
    return out


def value_error(field: str, value) -> str | None:
    """Why this answer is not a valid value for the field, or None."""
    spec = load_fields().get(field)
    if spec is None:
        return f"unknown field {field!r}"
    if spec["type"] == "bool":
        return None if isinstance(value, bool) else f"{field} must be true or false"
    if spec["type"] == "enum":
        return None if value in spec["values"] else f"{field} must be one of {', '.join(spec['values'])}"
    if not isinstance(value, list) or any(v not in spec["values"] for v in value):
        return f"{field} must be a list drawn from {', '.join(spec['values'])}"
    return None


def evaluate(c: dict, facts: dict) -> bool | None:
    """True or False when the fact is known, None when it is unknown or the criterion is unreadable."""
    if c.get("kind") != "rule" or c.get("field") not in facts:
        return None
    have, op, want = facts[c["field"]], c["op"], c["value"]
    if op == "eq":
        return have == want
    if op == "neq":
        return have != want
    if op == "in":
        return have in want
    if op == "not_in":
        return have not in want
    if op == "includes":
        return want in have
    if op == "includes_any":
        return any(v in have for v in want)
    return None


def match_resource(r: dict, facts: dict) -> dict:
    why, unknown, failed, office = [], [], [], []
    for c in r["eligibility"]:
        if c.get("kind") == "office":
            office.append(c["text"])
            continue
        outcome = evaluate(c, facts)
        entry = {"field": c.get("field"), "text": c["text"], "evidence_quote": c.get("evidence_quote")}
        (why if outcome else failed if outcome is False else unknown).append(entry)
    status = "no" if failed else "maybe" if unknown else "yes"
    return {
        "id": r["id"],
        "status": status,
        "why": why,
        "unknown": sorted({u["field"] for u in unknown if u["field"]}),
        "unknown_criteria": unknown,
        "failed": failed,  # debugging only; never shown to students
        "office_decides": office,
        "basis": SELF_REPORTED if why else None,
        "data_version": r["data_version"],
    }


def _value(r: dict) -> Decimal:
    v = (r.get("benefit") or {}).get("value")
    return Decimal(str(v)) if v is not None else Decimal(-1)


def next_question(maybes: list[dict], skip=()) -> dict | None:
    """The unknown field in the most maybe results. Ties go to non-sensitive fields, then field order.
    Fields in `skip` (the student chose not to answer for now) are not asked again."""
    fields = load_fields()
    order = list(fields)
    counts: dict[str, int] = {}
    for m in maybes:
        for f in m["unknown"]:
            if f not in skip:
                counts[f] = counts.get(f, 0) + 1
    if not counts:
        return None
    best = min(counts, key=lambda f: (-counts[f], bool(fields[f].get("sensitive")), order.index(f)))
    spec = fields[best]
    return {
        "field": best,
        "count": counts[best],
        "question": spec["question"],
        "type": spec["type"],
        "values": spec.get("values"),
        "labels": spec.get("labels"),
        "sensitive": bool(spec.get("sensitive")),
        "why": spec.get("why"),
    }


def run_match(resources: list[dict], facts: dict, needs, skip=()) -> dict:
    """Match a profile against approved resources. Deterministic and independent of input order."""
    facts = {f: v for f, v in facts.items() if v is not None}  # null means unknown
    if errors := [e for f, v in facts.items() if (e := value_error(f, v))]:
        raise ProfileError("; ".join(errors))
    # Non-negotiable 4: only fields an approved rule uses may be part of a profile.
    if unused := sorted(set(facts) - fields_used([r["eligibility"] for r in resources])):
        raise ProfileError(f"no approved rule uses: {', '.join(unused)}")
    selected = expand_needs(needs)
    shown = [r for r in resources if not r["relevance"] or selected & set(r["relevance"])]
    by_id = {r["id"]: r for r in shown}
    results = [match_resource(r, facts) for r in sorted(shown, key=lambda r: r["id"])]

    def rank(m):
        return (-_value(by_id[m["id"]]), -len(m["why"]), m["id"])

    yes = sorted((m for m in results if m["status"] == "yes"), key=rank)
    maybe = sorted((m for m in results if m["status"] == "maybe"), key=lambda m: (len(m["unknown"]), *rank(m)))
    no = [m for m in results if m["status"] == "no"]
    versions = [r["data_version"] for r in resources if r.get("data_version") is not None]
    return {
        "data_version": max(versions) if versions else None,
        "needs": sorted(selected),
        "yes": yes,
        "maybe": maybe,
        "no": no,
        "next_question": next_question(maybe, set(skip)),
    }
