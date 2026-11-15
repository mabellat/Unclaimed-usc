"""One-time cleanup (2026-11-14): remove reviewer notes that slipped into student-facing text,
e.g. "(this resolves the earlier disagreement between pages)". Facts are unchanged.

Creates a PENDING version of each record. Students keep seeing the approved text until the owner
approves the new versions in /admin ("Approve all pending").

Usage: python -m unclaimed.clean_text
"""

import copy

from unclaimed import review
from unclaimed.db import SessionLocal

FORM = "https://docs.google.com/forms/d/e/1FAIpQLSfjrhPHhAlu-AcqUKyWsruoVKJWikSXXoaNCw2uSaXPO0WTjw/viewform"

# resource id -> {field: new value}. "steps" is a list of texts; "rule_text" maps old rule text -> new.
EDITS = {
    "purf": {"benefit_label": "Stipend of $1,000 for Fall or Spring, $3,000 for Summer"},
    "calfresh-navigation": {
        "steps": ["https://www.getcalfresh.org"],
        "note": "Participation does not affect financial aid, and parental tax information is not required.",
        "rule_text": {"decided by the county and state, NOT by USC": "decided by the county and state, not by USC"},
    },
    "cavaney-vet": {"note": "Open to incoming or continuing students.\nPreference for economic growth and job creation goals."},
    "first-generation-plus-success-center": {"rule_text": {
        'first-generation (USC pages differ: "parents do not have four-year degrees" vs "neither parent completed college"), '
        "transfer, undocumented or former foster youth": "first-generation, transfer, undocumented or former foster youth"}},
    "free-legal-counseling": {"steps": ["Call USG at (213) 740-5620, or walk in", f"Online form: {FORM}"]},
    "federal-work-study": {"rule_text": {"Career Center page: international students are not eligible.": "not on an F-1 or J-1 visa"}},
    "half-century-trojans": {"benefit_label": "Scholarship; the amount isn't published",
                             "deadline_label": "Deadline February 16, 2027"},
    "sbn-housing-support": {"benefit_label": (
        "navigation help (not housing placement): the Community Resource Guide, off-campus housing referrals, "
        "USC Off-Campus Housing 101, rental assistance through the Supplemental Funding Award, and a possible "
        "referral to DePaul USA's Dax Program")},
    "sbn-supplemental-funding": {"benefit_label": "One-time financial assistance for housing, food, or medical/dental costs"},
    "surf-shure": {"deadline_label": "Summer 2027 window: Thursday March 4 - Thursday April 8, 2027."},
    "usc-immigration-clinic": {"benefit_label": (
        "free legal consultations, assistance and referrals through the Immigrant Legal Assistance Center (ILAC); "
        "also DACA renewal help (USC First Generation Plus Success Center pays the renewal filing fee for current students)")},
    "usc-lyft-rides": {"where": "Evening hours (summer hours about 8 PM to 2 AM)"},
}


def changes_for(live, edit: dict) -> dict:
    changes = {k: v for k, v in edit.items() if k not in ("steps", "rule_text")}
    if "steps" in edit:
        changes["steps"] = [{"text": t, "evidence_quote": None} for t in edit["steps"]]
    if "rule_text" in edit:
        elig = copy.deepcopy(live.eligibility)
        for c in elig:
            c["text"] = edit["rule_text"].get(c["text"], c["text"])
        changes["eligibility"] = elig
    return changes


def main():
    created, skipped = [], []
    with SessionLocal() as session:
        for rid, edit in EDITS.items():
            live = review.live_version(session, rid)
            if live is None:
                skipped.append(f"{rid} (not approved)")
                continue
            r = review.new_version(session, rid, changes_for(live, edit),
                                   meta={"flags": "Text cleanup 2026-11-14: reviewer notes removed from student-facing text. Facts unchanged."})
            (created if r else skipped).append(rid if r else f"{rid} (a pending version already exists, or nothing changed)")
    print(f"Created {len(created)} pending versions: {', '.join(created)}")
    if skipped:
        print("Skipped: " + "; ".join(skipped))
    print("Approve them at http://localhost:8000/admin (Approve all pending), then run: make export-approved")


if __name__ == "__main__":
    main()
