# Step 6 summary: the Watcher (crawl, extract, diff, alerts)

Status as of 2026-11-13: done. 163 API tests pass (no network in tests). The web build passes. A real run fetched all 44 allowlisted pages in 34 seconds and flagged 3 records for review (below). The follow-up loop was run in the browser: a claim sent 8 days ago, then the Watcher, then the follow-up alert, then "Got it", then Claims shows Received.

## How it works (`apps/worker/`)
| Step | File | What it does |
|---|---|---|
| Crawl | `crawl.py` | Fetches every URL in `data/sources.json` (allowlist enforced, no redirects off it). Stores the raw text, a hash and the fetch date in `page_snapshots` |
| Compare | `watcher.py` + `agents/sources.compare` | Checks each approved record against its page. Anything but "verified" goes to `/admin/source-checks`, once per version until reviewed. No AI needed |
| Extract | `extract.py` | Only when a page changed (or its quote went missing) **and** a Claude key is set. Claude reads the page into a candidate. **Every value must come with a quote that is on the page verbatim, or it is dropped (null)** |
| Diff | `diff.py` | Compares the candidate with the approved record. A field the page stops mentioning is reported, never erased. Eligibility text is compared, but rules are never changed automatically. Pages that disagree become `conflicts` |
| Propose | `review.new_version` | A **new pending version**, with notes for you in Flags. The approved version stays live. Re-running never stacks versions |
| Follow up | `watcher.py` | Claims sent over 7 days ago with no reported outcome get a polite follow-up draft. The student is asked: Got it / Turned down / Still waiting |

## Students hear about changes only after approval
- Approving a version that replaces another writes a `resource_changes` row: the student-facing fields that changed, old and new.
- Alerts read only `resource_changes`, the approved `conflicts` and Watcher follow-ups. They show an UPDATED alert with old/new lines, a TWO VERSIONS alert with each page's value and link, and FOLLOW-UP with outcome buttons. Alerts driven by the demo clock are labelled SIMULATED.
- Tickets show "USC pages disagree" with both versions and their sources.
- The outcome the student reports replaces the simulated status (`POST /students/{id}/claims/{rid}/outcome`).

## Run it
- `make watch`: run once now
- `make watcher`: nightly at 3:00 America/Los_Angeles (APScheduler)

## What the first real run found (for the owner)
- **financial-aid-appeal-grad:** the approved quote paraphrases the page. The page says: "...through the 'Required Info and Forms' page of your FAST portal."
- **usc-immigration-clinic:** the approved quote paraphrases the page. The page says: "provides free, confidential consultations, legal assistance, and referrals to members of the USC Trojan Family".
- **free-legal-counseling:** the usg.usc.edu home page is now short (2,212 characters) and no longer mentions legal counseling. A deeper USG page, or the GSG page, may be the better source.
