"""Create a new PENDING version of each approved resource with structured eligibility
from data/eligibility_rules.json. Nothing is approved here; the approved version stays
live until the owner approves the new one in /admin.

Usage: python -m unclaimed.structure_rules
Re-running is safe: a resource that already has a pending version is skipped.
"""

from sqlalchemy.orm import Session

from unclaimed import repo, review
from unclaimed.db import SessionLocal
from unclaimed.rules import criterion_error, load_rules


def _criterion(c: dict) -> dict:
    return {"source_url": None, "evidence_quote": None} | c


def _append(items: list[dict], texts: list[str]) -> list[dict]:
    have = {i["text"] for i in items}
    return items + [{"text": t, "evidence_quote": None} for t in texts if t not in have]


def changes_for(live, spec: dict) -> dict:
    note_lines = [line for line in (live.note or "").splitlines() if line.strip()]
    note_lines += [t for t in spec.get("note_add", []) if t not in note_lines]
    return {
        "eligibility": [_criterion(c) for c in spec["eligibility"]],
        "steps": _append(live.steps, spec.get("steps_add", [])),
        "docs": _append(live.docs, spec.get("docs_add", [])),
        "note": "\n".join(note_lines) or None,
    }


def structure_all(session: Session) -> dict[str, list[str]]:
    rules = load_rules()
    report = {"created": [], "already_pending": [], "no_approved_version": [], "not_in_rules_file": []}
    for rid, spec in rules.items():
        if errors := [e for c in spec["eligibility"] if (e := criterion_error(c))]:
            raise review.ReviewError(f"{rid}: " + "; ".join(errors))
        live = review.live_version(session, rid)
        if live is None:
            report["no_approved_version"].append(rid)
            continue
        created = review.new_version(session, rid, changes_for(live, spec))
        report["created" if created else "already_pending"].append(rid)
    report["not_in_rules_file"] = [r.id for r in repo.list_approved(session) if r.id not in rules]
    return report


def main():
    with SessionLocal() as session:
        report = structure_all(session)
    print(f"Created {len(report['created'])} pending versions. Review them at /admin (nothing is live until you approve).")
    labels = {"already_pending": "Skipped, a pending version already exists",
              "no_approved_version": "In the rules file but not approved",
              "not_in_rules_file": "Approved but not in the rules file (still prose only)"}
    for key, label in labels.items():
        if report[key]:
            print(f"{label}: {', '.join(report[key])}")


if __name__ == "__main__":
    main()
