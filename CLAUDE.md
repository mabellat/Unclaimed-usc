# Unclaimed

Pitch: **USC has set money and help aside. Unclaimed finds what's yours, then an AI agent does the paperwork.**
Built for the "AI @ USC" hackathon (prompt: an AI-powered tool that makes campus life better for USC students).
Judged on: (1) usability, how many students would use it, (2) ease of use, (3) a polished, intuitive, architecturally real app.
Positioning: USC Scholarship Universe matches students to scholarships, but not all departments use it, and Experience USC is a portal with no eligibility matching that we could find. Unclaimed puts everything a student may be entitled to in ONE place inside the app: emergency funds, scholarships, legal help, career services and basics. It explains WHY they qualify, helps them claim it, and watches the source pages. Do not link students out to other tools to discover or match; everything shows up in the Unclaimed wallet. Where the application itself can only be submitted inside a USC system (e.g. a login-only portal), the ticket's steps say so, and the student still gets the checklist, drafted materials and tracking in Unclaimed.
Scholarships: launch with a small curated set of 5 to 10, chosen to cover different student profiles, each approved by the owner under the same rules as every other resource. The design must scale to more scholarships later without code changes (data only).

## Non-negotiables (read first, enforce in code, not just in prompts)
1. **Only human-approved data feeds the matcher.** Crawlers and LLMs create pending candidates only.
2. **The LLM never decides eligibility and never invents facts.** It reads pages into candidates, maps language to tool calls, and drafts messages.
3. **Agents never send anything on a student's behalf.** The student reviews and sends.
4. **A profile field exists only if an approved resource rule uses it.** Never collect, store or ask for a field no approved rule needs.
5. **Unknown is never false, and a "yes" is never shown while any eligibility criterion is unknown.** Show "maybe" and resolve it by asking the student (see "Resolving a maybe" below).
6. **Never invent amounts, dates, deadlines or requirements.** Missing data stays null.
7. **Be upfront about what is simulated** (see below) in the UI and the pitch.

## Real vs simulated
- REAL: crawl and extraction into pending candidates, review and approval, rules engine, matching, ranking, next-best-question, claim agent (verify, requirements, draft, groundedness check), Navigator, diff and alerts, follow-up drafts.
- SIMULATED: the review timeline (In review / Received). Only USC offices see decisions. The Demo clock (Day 1 / 7 / 30) advances statuses. In production the student reports the outcome or we ask later.

## Stack and layout
Next.js (App Router) + TypeScript + Tailwind; FastAPI + Pydantic; PostgreSQL (SQLAlchemy + Alembic); scheduled worker (APScheduler or cron); Anthropic API with tool use, LangGraph for the agent graph and trace; Vercel (web), Railway or Render (api + db).
```
/apps/web         Next.js app
/apps/api         FastAPI (routers: resources, match, claims, alerts, profile, admin)
/apps/worker      crawl.py, extract.py, diff.py
/data/sources.json        allowlisted source URLs to extract from
/data/resources.json      seed records (all start as pending)
/data/profile_fields.json     student profile fields (each used by an approved rule)
/data/eligibility_rules.json  structured eligibility per resource
/data/approved_resources.json snapshot of approved records for tests (make export-approved)
/data/golden_profiles.json    golden test profiles with hand-worked expected results
/data/demo_personas.json  demo students with expected results
/reference/prototype.html clickable prototype: visual and copy spec ONLY
```
The prototype is the spec for layout, copy, tokens and screen flow. Its matching logic is a simplification; implement the semantics below, not the prototype's `evaluate()`.

## Data model
Resource (every record carries evidence: at least a source URL and one evidence quote from that page; per-field quotes are optional and preferred when available):
```json
{
  "id": "gsg-travel-award",
  "title": "GSG Travel Award",
  "provider": "Graduate Student Government",
  "category": "cash",
  "benefit": { "label": "$500 per academic year", "value": 500, "period": "academic year", "evidence_quote": "..." },
  "eligibility": [ { "field": "level", "op": "eq", "value": "grad", "evidence_quote": "...", "source_url": "..." } ],
  "relevance": ["conference"],
  "deadline": { "label": "Rolling, apply before you travel", "evidence_quote": "..." },
  "where": "EngageSC, engage.usc.edu",
  "steps": [ { "text": "Apply on EngageSC before the trip", "evidence_quote": "..." } ],
  "docs": [ { "text": "Conference acceptance or registration", "evidence_quote": "..." } ],
  "note": "Last-resort fund. Requires the programming fee.",
  "source_url": "https://engage.usc.edu/Gsg/gsg-ta/",
  "evidence_quote": "$500 per student per academic year",
  "owner_verified": true,
  "last_verified": "2026-11-12",
  "status": "pending",
  "approved_by": null, "approved_at": null, "data_version": null
}
```
Eligibility criteria (owner decision 2026-11-13): `kind: "rule"` uses a field from `data/profile_fields.json` with op eq | neq | in | not_in (bool, enum) or includes | includes_any (multi); `kind: "office"` is a judgment the office makes (financial need, food or housing insecurity, disability, caretaking, leadership), shown on the ticket as "The office decides this" and never blocking a yes. Prose-only criteria cannot be approved. Steps and limits (join a group, interview, one award per year, bring your USCard, cannot combine with other funding) go in steps, docs or note, not eligibility. Rules live in `data/eligibility_rules.json`.
categories: cash | scholarship | legal | career | basics | health | jobs | academic_support | transportation | support_office | community | international (extended by owner 2026-11-13). `value` only when an amount is known. Evidence (owner decision 2026-11-13): every record needs a `source_url` and a record-level `evidence_quote`; a record missing either cannot be approved. Individual fields do not each need their own quote when the owner has verified every field against the source page (`owner_verified: true`). Never invent a value: anything the source does not state stays null.
Student profile has two parts:
- **Eligibility facts**, tri-state true/false/unknown: level, school, visa category, enrollment, GPA band, and so on.
- **Needs**, selected by the student: money, conference, research, caregiver, housing, legal, job, food, wellbeing, accessibility, academics, transport, community, international (last six added by owner 2026-11-13). Housing implies legal.
Profile fields are derived from approved resource rules (non-negotiable 4). Sensitive fields (visa category, accessibility, communities, health insurance, financial aid status) are optional, asked only when an approved rule needs them and answering would unlock a match, always with a "why we ask" line, never inferred, always viewable and deletable.

## Resolving a maybe (ask the student)
A "maybe" is never a dead end. The way to resolve it is to ask the student directly.
- The next-best-question screen asks one question at a time, picking the field that resolves the most maybes. Each maybe card also shows the exact question it needs, and tapping it lets the student answer right there.
- An answer is stored as **self-reported** (`source: "student"`) and the resulting "yes" says so: "Based on what you told us. The office will confirm."
- Facts that offices verify themselves (enrollment status, GPA, visa category, financial aid status) are asked the same way but are never presented as verified. The Claim Agent's checklist includes "confirm this is still true" for each self-reported eligibility fact, and the packet repeats it.
- Never auto-fill an unknown from a guess or from inference. Only the student's own answer resolves it.

## Matching semantics (single source of truth)
For each approved resource:
1. **Relevance:** if `relevance` is non-empty and none of those needs is selected, the resource is not shown. An empty `relevance` means open to everyone.
2. **Eligibility:** every criterion must pass.
   - any criterion known and failing -> `no`
   - else any criterion unknown -> `maybe` (record which fields are unknown)
   - else -> `yes`
3. Return per resource: `why` (criteria that passed, with evidence), `unknown` (what to ask), `failed` (debugging only, never shown), plus `data_version`.
4. **Next-best-question:** the unknown field appearing in the most `maybe` results, with the count it would unlock.
5. **Rank** `yes` results by value descending, then by number of criteria matched.

## Data pipeline and approval
1. Worker fetches only allowlisted usc.edu URLs from `data/sources.json` (reject sc.edu, uscupstate.edu and any other domain, except the owner-approved exceptions listed in that file: currently only uscimmigrationclinic.org) and stores raw text with a fetch date.
2. Extraction produces **pending** candidates with a source URL and at least one evidence quote; per-field quotes where the page supports them. A value the page does not state stays null.
3. Review tool (CLI or /admin page): shows each candidate beside its quote and the diff from the current approved version; the owner edits as needed, then approves or rejects the whole record, stamping `approved_by`, `approved_at` and a new `data_version`.
4. The matcher and agents read ONLY `status = approved`. Everything else is invisible to students.
5. Source changes (nightly diff) create a NEW pending version; the approved version stays live until a human approves the new one. Conflicts between pages (e.g. legal counseling hours) are surfaced as alerts and shown to students as both versions.
6. Every approved record carries `data_version`; API responses return it.
Bringing in the owner's own data: put hand-collected records into `data/resources.json` as `pending` with evidence quotes, run them through the same review tool. Nothing is trusted because the owner wrote it; it must pass the same gate.
Known starting sources (unverified, extract as pending): campussupport.usc.edu emergency loan and basic needs pages; engage.usc.edu/Gsg (Emergency Fund, Travel Award, Empowerment Award, Caretaker Subsidy); studentbasicneeds.usc.edu economic support; dornsife.usc.edu/css (SURF/SHURE); academicprograms.usc.edu (PURF); usg.usc.edu and ois.usc.edu legal counseling; ois.usc.edu safety-support-resources; careers.usc.edu; itservices.usc.edu laptop loans; school-specific emergency funds (Annenberg, Cinematic Arts). Scholarships: choose 5 to 10 with clear public eligibility rules, open to current students, covering different profiles (e.g. undergraduate, graduate, first-generation, veteran, research or conference funding, career-related). Scholarship pages are often academic-year specific: record the academic year, application window and deadline with evidence quotes; if the next window is not published, set the deadline to null and say so on the ticket. Never carry last year's dates forward.

## Demo mode (the demo must produce proper results on real, approved data)
- `data/demo_personas.json` holds 3 to 5 named students (e.g. master's student with research and a conference, international grad with a landlord problem, undergrad job hunter). Each lists its profile and the exact expected `yes` and `maybe` sets and next-best-question. These are also golden test profiles.
- Demo runs on approved data only. A "Load demo student" button and a real hand-built card go through the same API.
- Demo-readiness checklist, scripted as `make demo-check`:
  1. every resource shown in any persona result is `approved` with evidence
  2. every persona's results match its expected sets
  3. every source link returns a successful response
  4. the Claim Agent runs on each demo resource and passes the groundedness check
  5. agent outputs for demo resources are cached, so a failed API call or bad Wi-Fi falls back to the cached run
  6. a recorded backup of the full demo exists
- No USC login in the demo. The card is stored against a pseudonymous id and can be deleted.

## Agents
LLM reads, plans and drafts through TOOLS only. Claude API with tool use; LangGraph for the graph and trace. Tool allowlist per agent; no network beyond allowlisted usc.edu fetches and the LLM API. Log every run (inputs, tool calls, outputs) for the trace UI.
1. **Claim Agent (build first).** Trigger: "Claim it for me". Graph: `plan -> verify_source -> gather_requirements -> draft -> groundedness_check -> present_packet`. Tools: `get_profile`, `get_resource` (approved only), `fetch_source` (live text compared to the approved record; mismatches flagged for owner review, never silently trusted), `list_requirements` (each tied to an evidence quote), `draft_document`, `create_ics`, `set_reminder`, `groundedness_check(draft, evidence)` (every statement must trace to the profile or an evidence quote; fail and redraft). Output: claim packet (checklist, drafted message, reminder, source link, verified-at). UI: live trace screen, then packet screen, matching the prototype.
2. **Navigator (chat).** Maps plain words to card fields. Tools: `update_card`, `run_match`, `get_resource`, `open_ticket`. Never infers sensitive fields. Shows tool calls as chips. If it cannot map a message, say so and suggest examples.
3. **Watcher (background).** Nightly crawl, extract, diff, create pending changes, notify students only after approval. Drafts a polite follow-up for claims sent over a week ago and asks the student for the outcome.

## Tests
- Golden profiles (at least 12; the demo personas count): grad and undergrad, each school, international, caregiver, no situations selected. Expected results signed off by the owner.
- Property tests: adding a known fact never turns a `no` into a `yes` without a matching criterion; unknown never produces `yes`; results are deterministic and order-independent.
- Every approved resource is reachable by at least one golden profile.
- Agent evals: golden claim packets per demo resource (no invented requirements), groundedness pass rate, refusal tests (must not claim eligibility, must not send anything).

## Design (match reference/prototype.html)
- Cardinal #990000, dark cardinal #5C0000, gold #FFCC00, paper #F3EDE1, ticket #FFFCF5, ink #1A1210, muted #5E524C, rule #D8CDB8
- Fonts: Fraunces (headlines), Inter (body), Oswald (labels, counters)
- Signature elements: perforated tickets with a colored category stub, gold flip-clock scoreboard counter, scalloped section edges, Trojan card with barcode, rotated CLAIMED stamp
- No gradient washes, no emoji, touch targets >= 44px, text contrast >= 4.5:1
- Footer note everywhere: sample data from public usc.edu pages, not official or USC-affiliated
- Scholarship tickets use the same ticket design with a "SCHOLAR" stub.
- Do not put USC marks or "Trojan" in the product name. "Trojan card" stays as the in-app label for the student's card (owner decision); the product name is Unclaimed.

## Build order (36h)
1. Schema, `data/sources.json`, review tool (so the owner can approve data while the rest is built)
2. Seed 40 to 50 resources as pending, favoring broad resources that apply to many students over niche ones; owner approves them against the source pages (the owner will gather more of these the next day)
3. Rules engine, /match, golden and property tests
4. Web app screens per prototype: welcome, build card, scan, wallet, ticket, claims, alerts, ask, my card
5. Claim Agent with trace and packet; Navigator
6. Worker: extraction on real pages, diff, alerts
7. Demo mode, `make demo-check`, cached agent runs, rehearsal, backup recording

## If time runs short (cut order)
Drop in this order, and stop dropping before the "never cut" list:
1. Watcher (build order step 6). Show nightly alerts as a pitch slide instead.
2. Navigator chat. The card builder already fills the profile.
3. Never cut: the review and approval tool, the rules engine with golden and property tests, the Claim Agent with trace and packet, demo mode with `make demo-check`.

## Rules for Claude Code
- Match the prototype's layout, copy and tokens; do not restyle.
- Implement the matching semantics above, not the prototype's simplified logic.
- Enforce non-negotiables in code (queries filter `status = approved`; the agent has no send tool), not only in prompts.
- Ask the owner before adding a profile field, a data source, or a resource.

## Potential improvements (NOT built; slide or pitch only)
- **Auto-submit with the student's approval:** the agent fills and submits applications on the student's behalf after an explicit confirmation. Not built because it needs the student's USC login, may conflict with USC's terms, and a wrong submission is hard to undo.
- **Real review status:** partnerships with USC offices so claim decisions flow back automatically, replacing the simulated review timeline.
- **More scholarships and resources:** the data-only design (approved records plus rule-based matching) extends to departments that do not use existing tools.
- **Verified profile:** with USC's permission, import verified facts (enrollment, program, financial aid) instead of self-reported answers.
Do not build any of these during the hackathon.
