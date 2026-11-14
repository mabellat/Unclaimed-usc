# Step 3 summary: rules engine, /match, golden and property tests

Status as of 2026-11-13: done. 116 tests pass. The golden expected results need the owner's sign-off.

## What was built
| Path | What it is |
|---|---|
| `apps/api/unclaimed/match.py` | The rules engine: relevance, yes / maybe / no, why, unknown, office judgments, ranking, next-best-question |
| `POST /match` | `{"facts": {...}, "needs": [...]}` in; `yes`, `maybe`, `no`, `next_question`, `data_version` out. Reads approved rows only |
| `apps/api/unclaimed/export_approved.py` | `make export-approved` writes `data/approved_resources.json`, the snapshot tests run on |
| `data/golden_profiles.json` | 13 profiles (3 demo personas) with expected results worked out by hand |
| `apps/api/tests/test_match.py` | 34 tests: golden, reachability, semantics, input validation, 4 property tests (Hypothesis), endpoint |

## How matching works
1. **Relevance:** a resource shows only if one of its needs is selected (empty = everyone). Housing adds legal.
2. **Each rule:** a missing or null answer is unknown, never false. Any rule failing -> `no`. Else any unknown -> `maybe`, listing the fields to ask. Else `yes`, with the line "Based on what you told us. The office will confirm."
3. **Office judgments** are returned as `office_decides` and never block a yes. An unreadable (prose) criterion counts as unknown, so it can never give a yes.
4. **Ranking:** yes by dollar value, then rules matched, then id. Maybe by fewest unknowns first.
5. **Next question:** the unknown field in the most maybes. Ties go to non-sensitive fields, then the order in `profile_fields.json`.
6. **Refused input:** unknown fields, wrong values, and any field no approved rule uses (non-negotiable 4).

## Property tests (Hypothesis, random profiles)
- an unknown fact never produces a yes
- adding a fact never turns a no into anything else, and a new yes always cites the new fact
- results are identical when resources, facts and needs are shuffled
- the next question is always the most common unknown

## For the owner
- **Sign off the golden results:** read each profile's `summary` and `expected` in `data/golden_profiles.json`, then set `signed_off_by` and `signed_off_at`.
- **After approving any change in /admin, run `make export-approved`,** then `make test`. A test fails if the snapshot and `data/eligibility_rules.json` disagree.
- **Wording to tidy (optional):** some rule texts read oddly as a student-facing "why", e.g. free legal counseling's "none stated beyond being a USC student". Editable in /admin.
