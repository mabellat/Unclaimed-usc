"""Owner review actions: edit, approve, reject. Only pending versions can change."""

from datetime import datetime, timezone
from decimal import Decimal

from sqlalchemy import func, select, text, update
from sqlalchemy.orm import Session

from unclaimed.models import Resource, ResourceChange, ReviewLog
from unclaimed.rules import criterion_error
from unclaimed.vocab import CATEGORIES, NEEDS


class ReviewError(ValueError):
    pass


EDITABLE = (
    "title", "provider", "category", "relevance", "benefit_label", "benefit_value", "benefit_period",
    "eligibility", "deadline_label", "academic_year", "where", "steps", "docs", "note",
    "source_url", "evidence_quote", "conflicts",
)
# Fields a student sees. A change to any of them, once approved, becomes an alert.
STUDENT_FACING = ("title", "provider", "benefit_label", "benefit_value", "benefit_period", "eligibility",
                  "deadline_label", "academic_year", "where", "steps", "docs", "note", "conflicts")


def get_version(session: Session, resource_id: str, version: int) -> Resource:
    r = session.get(Resource, (resource_id, version))
    if r is None:
        raise ReviewError(f"{resource_id} v{version} not found")
    return r


def _pending(session: Session, resource_id: str, version: int) -> Resource:
    r = get_version(session, resource_id, version)
    if r.status != "pending":
        raise ReviewError(f"{resource_id} v{version} is {r.status}, only pending records can change")
    return r


# Candidate 34 was rejected by the owner (no verifiable source). Never approve it, however it got in.
NEVER_APPROVE = {"usc-first-generation-scholarship"}


def approval_blockers(r: Resource) -> list[str]:
    blockers = []
    if r.id in NEVER_APPROVE:
        blockers.append("rejected by owner (candidate 34), never approved")
    if not (r.source_url or "").strip():
        blockers.append("no source URL")
    if not (r.evidence_quote or "").strip():
        blockers.append("no evidence quote")
    if r.category not in CATEGORIES:
        blockers.append("no valid category")
    blockers += [e for c in r.eligibility if (e := criterion_error(c))]
    return blockers


def _stamp(session: Session, r: Resource, approved_by: str) -> None:
    """Approve one pending version without committing. Shared by single and bulk approve."""
    if not approved_by.strip():
        raise ReviewError("approved_by is required")
    if blockers := approval_blockers(r):
        raise ReviewError(f"cannot approve {r.id}: " + ", ".join(blockers))
    previous = live_version(session, r.id)
    # The previous approved version stays live until this moment, then is superseded.
    session.execute(
        update(Resource).where(Resource.id == r.id, Resource.status == "approved").values(status="superseded")
    )
    data_version = session.scalar(text("SELECT nextval('data_version_seq')"))
    r.status = "approved"
    r.approved_by = approved_by
    r.approved_at = datetime.now(timezone.utc)
    r.data_version = data_version
    if previous is not None:
        changes = [{"field": f, "old": _plain(old), "new": _plain(new)} for f, old, new in diff(previous, r) if f in STUDENT_FACING]
        if changes:
            session.add(ResourceChange(resource_id=r.id, from_version=previous.version, to_version=r.version,
                                       to_data_version=data_version, approved_by=approved_by,
                                       approved_at=r.approved_at, changes=changes))


def approve(session: Session, resource_id: str, version: int, approved_by: str) -> Resource:
    r = _pending(session, resource_id, version)
    _stamp(session, r, approved_by)
    session.commit()
    return r


def plan_approve_all(session: Session) -> tuple[list[Resource], list[tuple[Resource, str]]]:
    """Split pending versions into those ready to approve and those skipped, with the reason."""
    ready, skipped = [], []
    for r in list_versions(session, "pending"):
        if blockers := approval_blockers(r):
            skipped.append((r, ", ".join(blockers)))
        else:
            ready.append(r)
    return ready, skipped


def approve_all(session: Session, approved_by: str, confirmed: set[tuple[str, int]]) -> tuple[list[Resource], list[tuple[Resource, str]], ReviewLog]:
    """Approve every ready pending version in one transaction, logged as one bulk action.

    `confirmed` is the exact set of (id, version) the owner saw on the confirmation step.
    If the queue changed since then, nothing is approved.
    """
    ready, skipped = plan_approve_all(session)
    if {(r.id, r.version) for r in ready} != confirmed:
        raise ReviewError("The pending queue changed since you confirmed. Nothing was approved; review the count again.")
    for r in ready:
        _stamp(session, r, approved_by)
    entry = ReviewLog(action="approve_all", actor=approved_by, at=datetime.now(timezone.utc), details={
        "approved": [{"id": r.id, "version": r.version, "data_version": r.data_version} for r in ready],
        "skipped": [{"id": r.id, "version": r.version, "reason": reason} for r, reason in skipped],
    })
    session.add(entry)
    session.commit()
    return ready, skipped, entry


def live_version(session: Session, resource_id: str) -> Resource | None:
    return session.scalar(select(Resource).where(Resource.id == resource_id, Resource.status == "approved"))


def new_version(session: Session, resource_id: str, changes: dict, meta: dict | None = None,
                force: bool = False) -> Resource | None:
    """Copy the approved version into a new pending version with `changes` applied.

    The approved version stays live until the owner approves this one. Returns None,
    changing nothing, if a pending version already exists or nothing would change.
    """
    live = live_version(session, resource_id)
    if live is None:
        raise ReviewError(f"{resource_id} has no approved version to build on")
    if session.scalar(select(Resource).where(Resource.id == resource_id, Resource.status == "pending")):
        return None
    unknown = set(changes) - set(EDITABLE)
    if unknown:
        raise ReviewError(f"not editable: {', '.join(sorted(unknown))}")
    if not force and all(getattr(live, f) == v for f, v in changes.items()):
        return None
    latest = session.scalar(select(func.max(Resource.version)).where(Resource.id == resource_id))
    copied = {c.key: getattr(live, c.key) for c in Resource.__table__.columns
              if c.key not in ("version", "status", "approved_by", "approved_at", "data_version", "created_at", "updated_at")}
    # meta: review-only notes for the owner (flags, candidate_text). Never shown to students.
    meta = {k: v for k, v in (meta or {}).items() if k in ("flags", "candidate_text", "proposed_fields")}
    r = Resource(**copied | changes | meta, version=latest + 1, status="pending",
                 approved_by=None, approved_at=None, data_version=None)
    session.add(r)
    session.commit()
    return r


def _plain(v):
    return float(v) if isinstance(v, Decimal) else v


def diff(old: Resource, new: Resource) -> list[tuple[str, object, object]]:
    """Fields that differ between two versions, in EDITABLE order."""
    return [(f, getattr(old, f), getattr(new, f)) for f in EDITABLE if getattr(old, f) != getattr(new, f)]


def reject(session: Session, resource_id: str, version: int) -> Resource:
    r = _pending(session, resource_id, version)
    r.status = "rejected"
    session.commit()
    return r


def edit(session: Session, resource_id: str, version: int, changes: dict) -> Resource:
    r = _pending(session, resource_id, version)
    unknown = set(changes) - set(EDITABLE)
    if unknown:
        raise ReviewError(f"not editable: {', '.join(sorted(unknown))}")
    if changes.get("category") is not None and changes["category"] not in CATEGORIES:
        raise ReviewError(f"unknown category: {changes['category']}")
    if "relevance" in changes and not set(changes["relevance"]) <= set(NEEDS):
        raise ReviewError(f"unknown needs: {', '.join(sorted(set(changes['relevance']) - set(NEEDS)))}")
    if changes.get("benefit_value") is not None:
        changes["benefit_value"] = Decimal(str(changes["benefit_value"]))
    for field, value in changes.items():
        if field == "relevance" and set(value) == set(r.relevance):
            continue  # same needs in a different order is not a change
        if getattr(r, field) != value:
            setattr(r, field, value)
            # Once the owner has set a proposed value by hand, it is no longer "proposed".
            if field in r.proposed_fields:
                r.proposed_fields = [f for f in r.proposed_fields if f != field]
    session.commit()
    return r


def counts(session: Session) -> dict[str, int]:
    rows = session.execute(text("SELECT status, count(*) FROM resources GROUP BY status")).all()
    return {status: n for status, n in rows}


def list_versions(session: Session, status: str | None = None) -> list[Resource]:
    q = select(Resource).order_by(Resource.candidate_ref, Resource.id, Resource.version)
    if status:
        q = q.where(Resource.status == status)
    return list(session.scalars(q))
