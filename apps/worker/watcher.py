"""The nightly Watcher.

  1. crawl     every allowlisted page -> page_snapshots (raw text + fetch date)
  2. compare   each approved record with its page; flag mismatches for the owner (no AI needed)
  3. extract   (with the AI model) changed pages -> candidate -> diff -> NEW PENDING version
  4. follow up claims sent over a week ago with no reply: draft a follow-up, ask the outcome

Nothing here changes approved data or reaches students. Students hear about a change only
after the owner approves the pending version (see review._stamp -> resource_changes).

Usage: python -m worker.watcher once | daemon
"""

import json
import sys
from collections import defaultdict
from datetime import datetime, timedelta, timezone

from sqlalchemy import select
from sqlalchemy.orm import Session

from unclaimed import repo, review
from unclaimed.agents import llm as llm_mod
from unclaimed.agents.llm import LLM, LLMError
from unclaimed.agents.sources import compare
from unclaimed.db import SessionLocal
from unclaimed.followup import followup_text
from unclaimed.models import Claim, PageSnapshot, SourceCheck, WatcherRun
from worker import crawl as crawl_mod
from worker import diff as diff_mod
from worker import extract as extract_mod

FOLLOW_UP_AFTER = timedelta(days=7)


def _flag(session: Session, r: dict, status: str, detail: str) -> bool:
    """Log a check for the owner, once per resource version and status until it is reviewed."""
    exists = session.scalar(select(SourceCheck.id).where(
        SourceCheck.resource_id == r["id"], SourceCheck.data_version == r["data_version"],
        SourceCheck.status == status, SourceCheck.reviewed.is_(False)).limit(1))
    if exists:
        return False
    session.add(SourceCheck(resource_id=r["id"], data_version=r["data_version"], url=r["source_url"], status=status, detail=detail))
    return True


def run(session: Session, llm: LLM | None, fetch=None, now: datetime | None = None) -> dict:
    now = now or datetime.now(timezone.utc)
    wr = WatcherRun(summary={})
    session.add(wr)
    session.commit()
    summary = defaultdict(int)
    summary["llm"] = llm is not None
    details: list[dict] = []

    pages = crawl_mod.crawl(session, fetch)
    by_url = {p["url"]: p for p in pages}
    summary["pages"] = len(pages)
    summary["pages_changed"] = sum(p["changed"] for p in pages)
    summary["pages_failed"] = sum(1 for p in pages if p.get("error") or (p.get("status_code") or 0) >= 400)
    urls_for = defaultdict(list)
    for p in pages:
        for rid in p["resource_ids"]:
            urls_for[rid].append(p["url"])

    for r in [repo.public_dict(x) for x in repo.list_approved(session)]:
        primary = by_url.get(r["source_url"])
        if primary is None:
            continue
        snap = session.get(PageSnapshot, primary.get("snapshot_id")) if primary.get("snapshot_id") else None
        status, detail = compare(r, snap.status_code if snap else None, snap.text if snap else None, snap.error if snap else primary.get("error"))
        if status != "verified" and _flag(session, r, status, f"Watcher: {detail}"):
            summary["flagged"] += 1
        changed = any(by_url[u]["changed"] for u in urls_for[r["id"]] if u in by_url)
        if llm is None or not (changed or status == "changed"):
            continue
        # Extract each source page of this resource.
        cands, dropped = [], []
        for u in urls_for[r["id"]]:
            s = session.get(PageSnapshot, by_url[u].get("snapshot_id")) if by_url[u].get("snapshot_id") else None
            if not s or not s.text or len(s.text) < 400:
                continue
            try:
                raw = extract_mod.extract(llm, s.text, u, r)
            except LLMError as e:
                dropped.append(f"{u}: extraction failed ({e})")
                continue
            clean, d = extract_mod.verify(raw, s.text)
            cands.append((u, clean))
            dropped += [f"{u}: {x}" for x in d]
        if not cands:
            continue
        main = next((c for u, c in cands if u == r["source_url"]), cands[0][1])
        changes, notes = diff_mod.changes_from(r, main)
        conflicts = diff_mod.conflicts_between(cands) if len(cands) > 1 else r.get("conflicts", [])
        if json.dumps(conflicts, sort_keys=True) != json.dumps(r.get("conflicts", []), sort_keys=True):
            changes["conflicts"] = conflicts
            notes.append(f"conflicts between pages: {len(conflicts)} field(s) disagree")
        if not changes:
            if notes:
                _flag(session, r, "changed", "Watcher: " + " | ".join(notes))
            continue
        flags = f"WATCHER {now.date().isoformat()}: proposed from the live page(s). Check each change against the page.\n" + \
                "\n".join(notes + ([f"Dropped (quote not on page): {x}" for x in dropped]))
        created = review.new_version(session, r["id"], changes, meta={"flags": flags, "candidate_text": json.dumps(cands, indent=1)})
        summary["pending_created" if created else "pending_already_open"] += 1
        details.append({"resource_id": r["id"], "changes": sorted(changes), "created": bool(created)})
    session.commit()

    # Follow-ups for claims sent over a week ago with no reported outcome.
    due = session.scalars(select(Claim).where(Claim.stage == "sent", Claim.outcome.is_(None), Claim.followup.is_(None),
                                              Claim.sent_at.is_not(None), Claim.sent_at <= now - FOLLOW_UP_AFTER)).all()
    titles = {r.id: r.title for r in repo.list_approved(session)}
    for c in due:
        c.followup = {"text": followup_text(titles.get(c.resource_id, c.resource_id)), "drafted_at": now.isoformat()}
    summary["followups_drafted"] = len(due)

    wr.summary = dict(summary) | {"details": details}
    wr.finished_at = datetime.now(timezone.utc)
    session.commit()
    return wr.summary


def main():
    mode = sys.argv[1] if len(sys.argv) > 1 else "once"
    if mode == "once":
        with SessionLocal() as session:
            print(json.dumps(run(session, llm_mod.get_llm()), indent=1))
    elif mode == "daemon":
        from apscheduler.schedulers.blocking import BlockingScheduler
        from apscheduler.triggers.cron import CronTrigger

        def job():
            with SessionLocal() as session:
                print(json.dumps(run(session, llm_mod.get_llm())))
        sched = BlockingScheduler()
        sched.add_job(job, CronTrigger(hour=3, minute=0, timezone="America/Los_Angeles"))
        print("Watcher scheduled nightly at 3:00 America/Los_Angeles. Ctrl+C to stop.")
        sched.start()
    else:
        sys.exit("usage: python -m worker.watcher once | daemon")


if __name__ == "__main__":
    main()
