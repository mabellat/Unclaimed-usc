"""The only read path for student-facing code (API, matcher, agents). Approved rows only."""

from sqlalchemy import func, select
from sqlalchemy.orm import Session

from unclaimed.models import Resource

APPROVED = Resource.status == "approved"


def list_approved(session: Session) -> list[Resource]:
    return list(session.scalars(select(Resource).where(APPROVED).order_by(Resource.id)))


def get_approved(session: Session, resource_id: str) -> Resource | None:
    return session.scalar(select(Resource).where(APPROVED, Resource.id == resource_id))


def current_data_version(session: Session) -> int | None:
    return session.scalar(select(func.max(Resource.data_version)).where(APPROVED))


def public_dict(r: Resource) -> dict:
    """The CLAUDE.md data model shape. Review-only fields (flags, candidate text) are left out."""
    return {
        "id": r.id,
        "title": r.title,
        "provider": r.provider,
        "category": r.category,
        "benefit": {
            "label": r.benefit_label,
            "value": float(r.benefit_value) if r.benefit_value is not None else None,
            "period": r.benefit_period,
        } if r.benefit_label else None,
        "eligibility": r.eligibility,
        "relevance": r.relevance,
        "deadline": {"label": r.deadline_label} if r.deadline_label else None,
        "academic_year": r.academic_year,
        "where": r.where,
        "steps": r.steps,
        "docs": r.docs,
        "note": r.note,
        "conflicts": r.conflicts or [],
        "source_url": r.source_url,
        "evidence_quote": r.evidence_quote,
        "last_verified": r.last_verified.isoformat() if r.last_verified else None,
        "status": r.status,
        "approved_by": r.approved_by,
        "approved_at": r.approved_at.isoformat() if r.approved_at else None,
        "data_version": r.data_version,
    }
