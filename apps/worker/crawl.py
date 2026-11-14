"""Fetch every allowlisted source page and store its raw text with the fetch date."""

import hashlib
import json

from sqlalchemy import select
from sqlalchemy.orm import Session

from unclaimed import DATA
from unclaimed.agents.sources import html_to_text, http_fetch, normalize
from unclaimed.allowlist import is_allowed
from unclaimed.models import PageSnapshot


def sources() -> list[dict]:
    return json.loads((DATA / "sources.json").read_text())["sources"]


def text_hash(text: str) -> str:
    return hashlib.sha256(normalize(text).encode()).hexdigest()


def latest(session: Session, url: str, before_id: int | None = None) -> PageSnapshot | None:
    q = select(PageSnapshot).where(PageSnapshot.url == url, PageSnapshot.error.is_(None))
    if before_id is not None:
        q = q.where(PageSnapshot.id < before_id)
    return session.scalar(q.order_by(PageSnapshot.id.desc()).limit(1))


def crawl(session: Session, fetch=None) -> list[dict]:
    """Returns one row per URL: {url, resource_ids, snapshot_id, status_code, changed, first, error}."""
    fetch = fetch or http_fetch
    out = []
    for src in sources():
        url = src["url"]
        if not is_allowed(url):  # sources.json is checked by tests too; never fetch off the allowlist
            out.append({"url": url, "resource_ids": src["resource_ids"], "error": "not on the allowlist", "changed": False, "first": False})
            continue
        prev = latest(session, url)
        try:
            code, html = fetch(url)
            text = html_to_text(html) if code < 400 else ""
            snap = PageSnapshot(url=url, status_code=code, text=text, text_hash=text_hash(text))
        except Exception as e:  # timeouts, network errors, off-allowlist redirects
            snap = PageSnapshot(url=url, error=str(e)[:500])
        session.add(snap)
        session.flush()
        ok = snap.error is None and (snap.status_code or 500) < 400
        out.append({"url": url, "resource_ids": src["resource_ids"], "snapshot_id": snap.id, "status_code": snap.status_code,
                    "error": snap.error, "first": ok and prev is None,
                    "changed": ok and prev is not None and prev.text_hash != snap.text_hash})
    session.commit()
    return out
