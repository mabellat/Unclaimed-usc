# Step 2 summary: seed resources and structure their eligibility

Status as of 2026-11-13: seeding done (45 approved, 10 of them scholarships). Structured eligibility is built and waiting for owner approval: 45 new pending versions, all ready to approve. 82 tests pass.

## Why step 2 needed more work
Step 1 stored eligibility as plain sentences ("registered graduate student"). The matcher (step 3) can't evaluate a sentence, so every resource would have shown "maybe". Step 2 turns each sentence into one of these:
- a **rule** the matcher evaluates, e.g. `level in masters, phd_or_other_grad`
- an **office judgment**, e.g. "demonstrated financial need", shown as "The office decides this"
- a **step, document or note**, e.g. "interview required" or "one award per academic year"

## Owner decisions (2026-11-13)
1. **Niche hard rules become per-resource yes/no questions:** Dornsife faculty mentor, under 144 units, expected graduation term, 50-year USC legacy, Southern California resident, Progressive Degree. If a student never answers one, the resource stays "maybe".
2. **Office judgments don't block a "yes"** and are never asked: financial need, food or housing insecurity, disability, caretaking, leadership, account standing, insurance plan criteria.
3. **Steps and limits move out of eligibility:** join the GSG EngageSC group, interviews, one award per year, bring your USCard, can't combine with other funding, parking permit, Lyft zones. Counseling and Student Health are open to any enrolled student, with the Student Health Fee and pay-as-you-go details in the note.
4. **First-gen:** one checkbox, with both USC definitions kept in the criterion text.

## Calls made while building (owner to check in /admin)
- **`level` has three values:** Undergraduate, Master's, and PhD or other graduate. "Graduate" rules accept both graduate values. The Cavaney scholarship needs Master's specifically, so a single "grad" value would have let PhD students through.
- **`schools` is multi-select,** because double majors are common.
- **`units_load`** (full time / at least half time / less) covers both the "full-time" and "at least half time" rules with one question.
- **Federal Work-Study:** the rule only excludes F-1/J-1 (the Career Center page says international students aren't eligible). "U.S. citizen or eligible noncitizen" stays an office judgment, so students with other statuses aren't wrongly told "no".
- **Trojan Food Pantry meal plan, CSI financial standing, SBN $0 balance:** office judgments, because the pages allow exceptions or the office checks them itself.

## Profile fields (`data/profile_fields.json`)
17 fields: enrolled, level, schools, units_load, gpa_band, continuing, gsg_fee_paid, citizenship*, has_ssn*, financial_aid*, communities*, has_dornsife_faculty_mentor, under_144_units, expected_graduation_term, usc_legacy_50yr, socal_resident, progressive_degree. (* = sensitive, with a "why we ask" line.)
A test fails if any field isn't used by a rule (non-negotiable 4).

## What was built
| Path | What it is |
|---|---|
| `data/profile_fields.json` | Field types, allowed values, question wording, sensitive flag and "why we ask" |
| `data/eligibility_rules.json` | Structured criteria per resource, plus what moved to steps, docs and notes |
| `apps/api/unclaimed/rules.py` | Validates criteria; one-line format for `/admin` |
| `apps/api/unclaimed/structure_rules.py` | `make structure-rules`: creates a new pending version of each approved record |
| `apps/api/unclaimed/review.py` | Approval refuses prose criteria; `new_version`, `live_version`, `diff` |
| `/admin` detail page | "Changes from the live version" table; eligibility edited as `field op value :: text` or `office :: text`; list of usable fields |
| `apps/api/tests/test_rules.py` | 23 tests: data files valid, every field used, moved text comes from the approved prose, approval gate, versioning, admin editing |

## Next action for the owner
1. `make admin ADMIN_PASSWORD=...` and open http://localhost:8000/admin.
2. Open any v2 record to see the before/after diff. Edit lines if needed.
3. Approve them one by one, or with "Approve all pending" (45 ready, 0 skipped). Until then, students still see v1.

## Not done here
- The matcher itself (step 3) and the golden profiles.
- Per-rule evidence quotes are null. Record-level evidence plus `owner_verified` covers them, per the 2026-11-13 evidence decision.
