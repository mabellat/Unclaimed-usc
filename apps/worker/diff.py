"""Compare an extracted candidate with the approved record, and pages with each other.

Conservative: a field the page no longer mentions is reported to the owner, never erased.
Eligibility rules are never changed here; changed eligibility text is flagged for a human."""

from unclaimed.agents.sources import normalize

FIELD_MAP = {"benefit_label": "benefit_label", "benefit_value": "benefit_value", "benefit_period": "benefit_period",
             "deadline_label": "deadline_label", "academic_year": "academic_year", "where": "where", "note": "note"}


def _same(a, b) -> bool:
    if isinstance(a, (int, float)) or isinstance(b, (int, float)):
        try:
            return float(a) == float(b)
        except (TypeError, ValueError):
            return False
    return normalize(str(a or "")) == normalize(str(b or ""))


def _approved(r: dict, f: str):
    b, d = r.get("benefit") or {}, r.get("deadline") or {}
    return {"benefit_label": b.get("label"), "benefit_value": b.get("value"), "benefit_period": b.get("period"),
            "deadline_label": d.get("label")}.get(f, r.get(f))


def changes_from(approved: dict, cand: dict) -> tuple[dict, list[str]]:
    """Return (changes for a new pending version, notes for the owner)."""
    changes, notes = {}, []
    for f, col in FIELD_MAP.items():
        new, old = cand.get(f), _approved(approved, f)
        if new is None:
            if old is not None:
                notes.append(f"{f}: the page no longer states this (kept as approved: {old!r})")
            continue
        if not _same(new["value"], old):
            changes[col] = new["value"]
            notes.append(f"{f}: {old!r} -> {new['value']!r}  (page: \"{new['quote']}\")")
    for k in ("steps", "docs"):
        new = [it["text"] for it in cand.get(k) or []]
        old = [it["text"] for it in approved.get(k) or []]
        if new and [normalize(x) for x in new] != [normalize(x) for x in old]:
            changes[k] = [{"text": it["text"], "evidence_quote": it["quote"]} for it in cand[k]]
            notes.append(f"{k}: {len(old)} -> {len(new)} items from the page")
    page_rules = {normalize(it["text"]) for it in cand.get("eligibility") or []}
    approved_rules = {normalize(c["text"]) for c in approved.get("eligibility") or []}
    if page_rules and page_rules != approved_rules:
        added = sorted(page_rules - approved_rules)
        if added:
            notes.append("ELIGIBILITY TEXT ON THE PAGE DIFFERS. Rules were not changed; update them by hand if needed: " + "; ".join(added))
    return changes, notes


def conflicts_between(pages: list[tuple[str, dict]]) -> list[dict]:
    """Fields where two pages for the same resource state different values."""
    out = []
    for f in FIELD_MAP:
        versions = [{"source_url": url, "value": c[f]["value"], "quote": c[f]["quote"]} for url, c in pages if c.get(f)]
        distinct = {normalize(str(v["value"])) for v in versions}
        if len(versions) > 1 and len(distinct) > 1:
            out.append({"field": f, "versions": versions})
    return out
