# Step 1 summary: schema, allowlist, import, review tool

Status as of 2026-11-13: done. 45 records imported and approved by the owner. 59 tests pass.

## What step 1 built, in order

### 1. A place to store resources (the database)
Each resource (for example the GSG Travel Award) is one row in the `resources` table in the local Postgres database `unclaimed`. Every row has a status: `pending`, `approved`, `rejected` or `superseded` (replaced by a newer approved version).

The database itself refuses to mark a row approved unless it has:
- who approved it (`approved_by`)
- when (`approved_at`)
- a data version number (`data_version`)
- a source URL
- a quote from the source page

So even buggy code later on can't sneak an unapproved record through.

Other tables:
- `review_log`: one row per "Approve all" run (who, when, what was approved and what was skipped).
- `student_facts`: students' self-reported answers. Empty until the app is built. A missing row means "unknown", never "false".
- `alembic_version`: which migration has run (currently `0002`).

### 2. A list of websites we're allowed to read (`data/sources.json`)
44 pages, all on usc.edu, plus one owner-approved exception: `uscimmigrationclinic.org` (used by `usc-immigration-clinic`). Everything else is refused, including look-alikes such as `sc.edu`, `uscupstate.edu` and `usc.edu.evil.com`. The crawler (step 6) will only fetch from this list.

### 3. Loading the candidate files into the database (`make import`)
The import read `data/candidates/candidates_batch1.md` to `candidates_batch4.md` and created 45 records, all pending:
- Record 34 was skipped (rejected by the owner), and is blocked from approval everywhere.
- Record 25 was split into `financial-aid-appeal-undergrad` and `financial-aid-appeal-grad`.
- Nothing was approved automatically.
- Re-running the import skips records that already exist, so it never overwrites a record you've reviewed.

### 4. The review tool (`/admin`)
This is where you look at each record next to its source link and quote, fix anything, and approve or reject it.
- Approve one record at a time, or use "Approve all pending" (also `make approve-all`).
- Approve all asks you to confirm the count first, skips records with no source URL, no quote or no valid category (listing the reason), never touches rejected records, and logs the run in `review_log`.
- Approved records can't be edited. A change needs a new pending version, which the nightly re-check will create in step 6.

### 5. The safety rule for students
Student-facing code (the API now, the matcher later) can only read approved records, through `apps/api/unclaimed/repo.py`. Pending or rejected records are invisible to students. `GET /resources` and `GET /resources/{id}` return the `data_version`.

## One record through the whole flow: GSG Travel Award
1. **The candidate file says:** "$500 per student per academic year", graduate students only, source `engage.usc.edu/Gsg/gsg-ta/`.
2. **After import:** the record is in the database as pending.
   - Title "GSG Travel Award", category cash, need: conference.
   - Benefit $500, with the value 500 read from the text.
   - Eligibility stored as plain sentences ("registered graduate student", "paid the Graduate Student Programming Fee", and so on).
   - Deadline null, because the page gives no dates.
   - Flags kept, e.g. "verify on the live page", plus "Provider: proposed, check", because the file didn't name a provider.
3. **A student asking the API at this point** gets nothing back for this award, because it's still pending.
4. **The owner opens `/admin`.** The record shows with its source link and quote beside it, the flags highlighted, and a "No deadline" tag. Any field can be edited.
5. **The owner approves it.** The record becomes approved and is stamped with `approved_by: manoj`, the time, and a data version number.
6. **A student asking the API now** gets the GSG Travel Award, along with its data version, so we always know which version of the data they saw.
7. **Later (step 6),** if the page changes to $650, the nightly check creates version 2 as pending. Students keep seeing $500 until the owner approves the new one. Then version 1 becomes "superseded".

## Decisions made along the way (owner, 2026-11-13)
- **Evidence:** one key quote per record is enough, because the owner already checked every field against the source page (`owner_verified = true`). A record with no source URL or no quote can't be approved. CLAUDE.md is updated to say so.
- **Categories:** health, jobs, academic_support, transportation, support_office, community and international were added alongside the original five.
- **Needs:** wellbeing, accessibility, academics, transport, community and international were added alongside the original eight.
- **Proposed values:** where a file had no category, need, title or provider, a value was proposed and tagged "proposed, check" in the review tool.
- **Eligibility** is stored as plain sentences for now. The matcher can't evaluate sentences, so until step 3 turns them into real rules, every resource will show as "maybe", never "yes".
- **Record 25** is stored as two records: undergraduate and graduate.

## Places where the file text wasn't copied verbatim
- **`gsg-emergency-fund` deadline:** "Fund applications are open September 9-30.", as the decision log says.
- **`gsg-caretaker-subsidy` deadline:** null, because the text only says to confirm whether it's open.
- **`writing-center`:** the room number is left out, as its flag asks.
- **`federal-work-study`:** value 4750, the top of the stated range, as the owner approved.
- **Batch 4 "window":** describes when and where a service runs, so it went into Where rather than Deadline.
- **Dollar values** were read automatically only when the benefit states exactly one amount ("$X" or "up to $X"). Ranges and averages stay null.

## Not built yet
- **A "what changed" view between versions.** It only matters once step 6 creates new versions.
- **Protection for a deployed admin page.** The review tool uses basic auth with no protection against forged form posts. That's fine locally, but it shouldn't be deployed like this.

## Handy commands
| Command | What it does |
|---|---|
| `make admin ADMIN_PASSWORD=your-choice` | Starts the review tool at http://localhost:8000/admin (user `manoj`) |
| `make approve-all` | Approves all ready pending records after one confirmation |
| `make import` | Loads the candidate files as pending (skips existing ids) |
| `make migrate` | Applies database migrations |
| `make test` | Runs the tests |

**Database:** Postgres.app on `localhost:5432`, database `unclaimed`, user `manojkumar`, no password. In pgAdmin, open **Servers → your server → Databases → unclaimed → Schemas → public → Tables**. Use pgAdmin for looking only; make changes through the review tool, so approvals are stamped and logged.

## Where the code lives
| Path | What it is |
|---|---|
| `apps/api/migrations/versions/` | Database schema (`0001_initial.py`, `0002_review_log.py`) |
| `apps/api/unclaimed/candidates.py` | Reads the candidate files |
| `apps/api/unclaimed/import_candidates.py` | Loads them as pending |
| `apps/api/unclaimed/review.py` | Approve, reject, edit, approve all |
| `apps/api/unclaimed/admin.py` + `templates/` | The `/admin` review tool |
| `apps/api/unclaimed/repo.py` | The approved-only read path |
| `apps/api/unclaimed/allowlist.py` + `data/sources.json` | Crawler allowlist |
| `apps/api/tests/` | Tests |
