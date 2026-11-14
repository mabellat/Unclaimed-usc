"""Owner review tool at /admin. HTTP basic auth; the username is stamped as approved_by."""

import os
import secrets
from pathlib import Path
from urllib.parse import quote

from fastapi import APIRouter, Depends, HTTPException, Request
from fastapi.responses import HTMLResponse, RedirectResponse
from fastapi.security import HTTPBasic, HTTPBasicCredentials
from fastapi.templating import Jinja2Templates
from sqlalchemy.orm import Session

from unclaimed import review, rules
from unclaimed.db import get_session
from unclaimed.models import SourceCheck
from unclaimed.vocab import CATEGORIES, NEEDS

templates = Jinja2Templates(directory=Path(__file__).parent / "templates")
basic = HTTPBasic()


def owner(credentials: HTTPBasicCredentials = Depends(basic)) -> str:
    user, password = os.environ.get("ADMIN_USER", ""), os.environ.get("ADMIN_PASSWORD", "")
    if not user or not password:
        raise HTTPException(503, "Set ADMIN_USER and ADMIN_PASSWORD to use the review tool")
    ok = secrets.compare_digest(credentials.username, user) and secrets.compare_digest(credentials.password, password)
    if not ok:
        raise HTTPException(401, "Wrong username or password", headers={"WWW-Authenticate": "Basic"})
    return credentials.username


router = APIRouter(prefix="/admin", dependencies=[Depends(owner)])


def _detail_url(resource_id: str, version: int, error: str | None = None) -> str:
    url = f"/admin/resources/{resource_id}/{version}"
    return url + (f"?error={quote(error)}" if error else "")


@router.get("", response_class=HTMLResponse)
def queue(request: Request, status: str | None = "pending", session: Session = Depends(get_session)):
    return templates.TemplateResponse(request, "queue.html", {
        "flagged": session.query(SourceCheck).filter(SourceCheck.status != "verified", SourceCheck.reviewed.is_(False)).count(),
        "counts": review.counts(session),
        "status": status,
        "rows": review.list_versions(session, status or None),
    })


@router.get("/resources/{resource_id}/{version}", response_class=HTMLResponse)
def detail(request: Request, resource_id: str, version: int, error: str | None = None,
           session: Session = Depends(get_session)):
    try:
        r = review.get_version(session, resource_id, version)
    except review.ReviewError:
        raise HTTPException(404, "not found")
    live = review.live_version(session, resource_id)
    compare = live if live is not None and live.version != r.version and r.status == "pending" else None
    return templates.TemplateResponse(request, "detail.html", {
        "r": r, "error": error, "blockers": review.approval_blockers(r),
        "categories": CATEGORIES, "needs": NEEDS,
        "live": compare, "changes": review.diff(compare, r) if compare else [],
        "fields": rules.load_fields(), "ops": rules.OPS, "line": rules.format_line,
    })


@router.post("/resources/{resource_id}/{version}/approve")
def approve(resource_id: str, version: int, user: str = Depends(owner), session: Session = Depends(get_session)):
    try:
        review.approve(session, resource_id, version, approved_by=user)
    except review.ReviewError as e:
        return RedirectResponse(_detail_url(resource_id, version, str(e)), status_code=303)
    return RedirectResponse("/admin", status_code=303)


@router.get("/approve-all", response_class=HTMLResponse)
def approve_all_confirm(request: Request, error: str | None = None, session: Session = Depends(get_session)):
    ready, skipped = review.plan_approve_all(session)
    return templates.TemplateResponse(request, "approve_all.html", {
        "ready": ready, "skipped": skipped, "error": error, "done": False,
    })


@router.post("/approve-all", response_class=HTMLResponse)
async def approve_all(request: Request, user: str = Depends(owner), session: Session = Depends(get_session)):
    form = await request.form()
    confirmed = {(key.rsplit("|", 1)[0], int(key.rsplit("|", 1)[1])) for key in form.getlist("key")}
    try:
        approved, skipped, entry = review.approve_all(session, approved_by=user, confirmed=confirmed)
    except review.ReviewError as e:
        session.rollback()
        return RedirectResponse(f"/admin/approve-all?error={quote(str(e))}", status_code=303)
    return templates.TemplateResponse(request, "approve_all.html", {
        "ready": approved, "skipped": skipped, "error": None, "done": True, "entry": entry,
    })


@router.post("/resources/{resource_id}/{version}/reject")
def reject(resource_id: str, version: int, session: Session = Depends(get_session)):
    try:
        review.reject(session, resource_id, version)
    except review.ReviewError as e:
        return RedirectResponse(_detail_url(resource_id, version, str(e)), status_code=303)
    return RedirectResponse("/admin", status_code=303)


def _text(form, key: str) -> str | None:
    value = (form.get(key) or "").strip()
    return value or None  # blank means null, never an invented default


def _lines(form, key: str) -> list[str]:
    return [line.strip() for line in (form.get(key) or "").splitlines() if line.strip()]


@router.post("/resources/{resource_id}/{version}/edit")
async def edit(request: Request, resource_id: str, version: int, session: Session = Depends(get_session)):
    form = await request.form()
    try:
        r = review.get_version(session, resource_id, version)
        # Keep any structure already on a criterion or step whose text is unchanged.
        old_quotes = {c["text"]: {k: c.get(k) for k in ("source_url", "evidence_quote")} for c in r.eligibility}
        old_steps = {s["text"]: s for s in r.steps}
        old_docs = {d["text"]: d for d in r.docs}
        blank_quotes = {"source_url": None, "evidence_quote": None}
        value = _text(form, "benefit_value")
        try:
            benefit_value = float(value) if value is not None else None
        except ValueError:
            raise review.ReviewError(f"benefit value must be a number: {value}")
        changes = {key: _text(form, key) for key in (
            "title", "provider", "category", "benefit_label", "benefit_period", "deadline_label",
            "academic_year", "where", "note", "source_url", "evidence_quote")}
        changes |= {
            "benefit_value": benefit_value,
            "relevance": form.getlist("relevance"),
            "eligibility": [old_quotes.get(c["text"], blank_quotes) | c
                            for c in map(rules.parse_line, _lines(form, "eligibility"))],
            "steps": [old_steps.get(t, {"text": t, "evidence_quote": None}) for t in _lines(form, "steps")],
            "docs": [old_docs.get(t, {"text": t, "evidence_quote": None}) for t in _lines(form, "docs")],
        }
        review.edit(session, resource_id, version, changes)
    except review.ReviewError as e:
        session.rollback()
        return RedirectResponse(_detail_url(resource_id, version, str(e)), status_code=303)
    return RedirectResponse(_detail_url(resource_id, version), status_code=303)


@router.get("/source-checks", response_class=HTMLResponse)
def source_checks(request: Request, session: Session = Depends(get_session)):
    """Live page re-checks that did not match the approved record. Approved data never changes here."""
    rows = session.query(SourceCheck).filter(SourceCheck.status != "verified").order_by(SourceCheck.checked_at.desc()).limit(200).all()
    return templates.TemplateResponse(request, "source_checks.html", {"rows": rows})


@router.post("/source-checks/{check_id}/reviewed")
def source_check_reviewed(check_id: int, session: Session = Depends(get_session)):
    row = session.get(SourceCheck, check_id)
    if row is None:
        raise HTTPException(404, "not found")
    row.reviewed = True
    session.commit()
    return RedirectResponse("/admin/source-checks", status_code=303)


@router.post("/resources/{resource_id}/{version}/new-version")
def start_new_version(resource_id: str, version: int, session: Session = Depends(get_session)):
    """Copy the live version into a pending one the owner can edit. Students keep the live one."""
    try:
        r = review.new_version(session, resource_id, {}, meta={"flags": "Started by the owner from the live version."}, force=True)
    except review.ReviewError as e:
        return RedirectResponse(_detail_url(resource_id, version, str(e)), status_code=303)
    if r is None:
        pending = next(x for x in review.list_versions(session, "pending") if x.id == resource_id)
        return RedirectResponse(_detail_url(resource_id, pending.version), status_code=303)
    return RedirectResponse(_detail_url(resource_id, r.version), status_code=303)
