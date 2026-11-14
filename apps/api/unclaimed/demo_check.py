"""Demo-readiness checklist (CLAUDE.md "Demo mode"). Usage: make demo-check [ARGS=--offline]

  1. every resource in any persona result is approved, with evidence
  2. every persona's results match its expected sets
  3. every source link returns a successful response              (network; skipped with --offline)
  4. the Claim Agent runs on each demo resource and passes the
     groundedness check, and the run is cached                     (network; skipped with --offline)
  5. agent outputs for demo resources are cached for the current data
  6. a recorded backup of the full demo exists
  + the test snapshot matches the approved data, and deadline status per persona

Exit code 0 only when nothing FAILs. WARN items don't block the demo but should be read.
"""

import argparse
import json
import sys

import httpx

from unclaimed import DATA, match, repo
from unclaimed.agents import demo_cache, llm as llm_mod
from unclaimed.agents.claim_graph import run_claim
from unclaimed.agents.sources import USER_AGENT
from unclaimed.allowlist import is_allowed
from unclaimed.db import SessionLocal
from unclaimed.models import Student, StudentFact
from unclaimed.rules import fields_used
from unclaimed.students import load_personas

BACKUP = DATA.parent / "docs" / "demo" / "backup"
results: list[tuple[str, str, str]] = []


def report(status: str, check: str, detail: str = "") -> None:
    results.append((status, check, detail))
    print(f"[{status:4}] {check}" + (f": {detail}" if detail else ""), flush=True)


def persona_match(resources: list[dict], p: dict) -> dict:
    askable = fields_used([r["eligibility"] for r in resources])
    return match.run_match(resources, {k: v for k, v in p["facts"].items() if k in askable}, p["needs"])


def check_links(resources: list[dict]) -> None:
    bad = []
    with httpx.Client(timeout=15, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
        for r in resources:
            url = r["source_url"]
            if not is_allowed(url):
                bad.append(f"{r['id']}: not on the allowlist")
                continue
            try:
                resp = client.get(url)
                if resp.status_code >= 400 or not is_allowed(str(resp.url)):
                    bad.append(f"{r['id']}: HTTP {resp.status_code} at {resp.url}")
            except httpx.HTTPError as e:
                bad.append(f"{r['id']}: {type(e).__name__}")
    report("FAIL" if bad else "PASS", f"3. source links ({len(resources)} checked)", "; ".join(bad))


def run_demo_claims(session, personas: list[dict], llm) -> None:
    for p in personas:
        for rid in p.get("demo_claims", []):
            sid = f"demo-check-{p['id']}"
            old = session.get(Student, sid)
            if old:
                session.delete(old)
                session.commit()
            session.add(Student(id=sid, needs=p["needs"], demo_persona=p["id"]))
            session.flush()
            for f, v in p["facts"].items():
                session.add(StudentFact(student_id=sid, field=f, value=v))
            session.commit()
            try:
                events = list(run_claim(session, sid, rid, llm))
                last = events[-1]
                trace = [e["event"] for e in events if "event" in e]
                if "done" not in last:
                    report("FAIL", f"4. claim agent: {p['name']} / {rid}", last.get("error", "did not finish"))
                    continue
                packet = last["done"]
                ok = packet["grounding"]["passed"]
                mode = packet["draft"]["mode"]
                source = packet["source_check"]["status"]
                if ok and mode in ("claude", "template"):
                    demo_cache.save(p["id"], rid, packet["data_version"], mode, trace, packet)
                report("PASS" if ok else "FAIL", f"4. claim agent: {p['name']} / {rid}",
                       f"draft={mode}, grounded={ok}, source page={source}" + ("" if ok else " (not cached)"))
            finally:
                session.delete(session.get(Student, sid))
                session.commit()


def main() -> int:
    ap = argparse.ArgumentParser(description=__doc__)
    ap.add_argument("--offline", action="store_true", help="skip checks that need the network (3 and 4)")
    args = ap.parse_args()
    personas = load_personas()
    llm = llm_mod.get_llm()
    print(f"Demo check. Claude key: {'yes' if llm else 'NO (template drafts)'}. Personas: {', '.join(p['name'] for p in personas)}\n")

    with SessionLocal() as session:
        resources = [repo.public_dict(r) for r in repo.list_approved(session)]
        by_id = {r["id"]: r for r in resources}

        # 1 + 2
        bad_evidence, mismatches = [], []
        for p in personas:
            res = persona_match(resources, p)
            for m in res["yes"] + res["maybe"]:
                r = by_id[m["id"]]
                if r["status"] != "approved" or not r["source_url"] or not r["evidence_quote"]:
                    bad_evidence.append(m["id"])
            exp = p["expected"]
            nq = res["next_question"]
            got_nq = {"field": nq["field"], "count": nq["count"]} if nq else None
            if [m["id"] for m in res["yes"]] != exp["yes"] or {m["id"] for m in res["maybe"]} != set(exp["maybe"]) or got_nq != exp["next_question"]:
                mismatches.append(p["name"])
            closed = [m["id"] for m in res["yes"] if (by_id[m["id"]].get("deadline") or {}).get("closed")]
            urgent = [f"{m['id']} ({by_id[m['id']]['deadline']['days_left']} days)" for m in res["yes"]
                      if (d := by_id[m["id"]].get("deadline")) and d.get("days_left") is not None and 0 <= d["days_left"] <= 14]
            if closed or urgent:
                report("INFO", f"   deadlines for {p['name']}", "; ".join(
                    ([f"closed: {', '.join(closed)}"] if closed else []) + ([f"due soon: {', '.join(urgent)}"] if urgent else [])))
        report("FAIL" if bad_evidence else "PASS", "1. every resource in a persona result is approved with evidence", ", ".join(sorted(set(bad_evidence))))
        report("FAIL" if mismatches else "PASS", "2. persona results match their expected sets", ", ".join(mismatches))

        # snapshot used by the tests
        snap = json.loads((DATA / "approved_resources.json").read_text())
        current = repo.current_data_version(session)
        report("PASS" if snap["data_version"] == current else "FAIL", "   test snapshot is current",
               "" if snap["data_version"] == current else f"snapshot {snap['data_version']} vs database {current}: run make export-approved")

        # 3 + 4
        if args.offline:
            report("SKIP", "3. source links", "--offline")
            report("SKIP", "4. claim agent on demo resources", "--offline")
        else:
            check_links(resources)
            run_demo_claims(session, personas, llm)

        # 5
        missing, template_only = [], []
        for p in personas:
            for rid in p.get("demo_claims", []):
                c = demo_cache.load(p["id"], rid, by_id[rid]["data_version"] if rid in by_id else None)
                if not c or not c["packet"]["grounding"]["passed"]:
                    missing.append(f"{p['name']}/{rid}")
                elif c["mode"] != "claude":
                    template_only.append(f"{p['name']}/{rid}")
        if missing:
            report("FAIL", "5. cached agent runs for the current data", "missing or stale: " + ", ".join(missing))
        elif template_only:
            report("WARN", "5. cached agent runs for the current data",
                   "cached, but with template drafts (no Claude key when they ran): " + ", ".join(template_only))
        else:
            report("PASS", "5. cached agent runs for the current data")

    # 6
    reel = BACKUP / "index.html"
    videos = [f for f in BACKUP.glob("*") if f.suffix.lower() in (".mp4", ".mov", ".webm")] if BACKUP.exists() else []
    if not reel.exists():
        report("FAIL", "6. recorded backup", "no click-through reel: run make demo-backup (API and web must be running)")
    elif not videos:
        report("WARN", "6. recorded backup", "screenshot reel exists; add a screen recording (QuickTime) to docs/demo/backup/")
    else:
        report("PASS", "6. recorded backup", f"reel + {videos[0].name}")

    fails = sum(1 for s, _, _ in results if s == "FAIL")
    warns = sum(1 for s, _, _ in results if s == "WARN")
    print(f"\n{'READY' if not fails else 'NOT READY'}: {fails} failed, {warns} warnings.")
    return 1 if fails else 0


if __name__ == "__main__":
    sys.exit(main())
