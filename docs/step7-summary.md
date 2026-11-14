# Step 7 summary: demo mode, demo-check, cached runs, backup

Status as of 2026-11-13: `make demo-check` says READY (0 failed, 2 warnings: template drafts until a Claude key is set, and no screen recording yet). 178 API tests pass. The web build passes.

## Built
- **Five demo personas** (`data/demo_personas.json`) from demo_personas.md: Priya, Wei, Marcus, Sofia and a blank card. Expected results were worked out by hand. They are golden tests too, along with each persona's demo moment (e.g. Priya: mentor = yes flips exactly SOAR and SURF).
- **Persona picker** on the welcome screen. A persona loads through the normal `POST /students`; it only links the card to its cached runs.
- **Deadlines:** a date is read only when the label states one clearly. Tickets show **Due Nov 19 · 6 days left** within 14 days and **Closed** once the date passes. Closed amounts leave the scoreboard, and the Claim Agent refuses a closed window.
- **`make demo-check`** runs the six CLAUDE.md checks, plus snapshot freshness and a deadline report. It writes the cached runs (`data/demo_cache/`).
- **Cached runs:** if Claude is down, the cached Claude draft is used and re-checked. With `UNCLAIMED_DEMO_REPLAY=1`, the whole cached run is replayed. Both are labelled on screen.
- **`make demo-backup`** records a 16-frame click-through reel of the real app (`docs/demo/backup/index.html`).
- **Rehearsal guide:** `docs/demo/rehearsal.md`.

## Differences from the draft in demo_personas.md (caused by step 2 decisions)
| Draft said | Now | Why |
|---|---|---|
| Priya: ExL and Work-Study MAYBE until "financial need?" | Both YES; the demo moment is "Dornsife faculty mentor?" (SOAR and SURF) | Financial need is an office judgment, never asked |
| Priya: SOAR and SURF YES | MAYBE until the mentor question | Mentor is a hard rule (step 2, decision 1) |
| Priya: Town and Gown MAYBE (residency) | Same | |
| Wei: metro-u-pass YES | Not shown | Wei didn't pick "Getting around" |
| Marcus: Skull and Dagger MAYBE | YES; leadership is listed under "The office decides" | Office judgments don't block a yes |
| Marcus: Work-Study MAYBE (need) | YES | Same |
| Sofia: CalFresh MAYBE, never YES | YES; "decided by the county and state" shown under "The office decides" | Same |
| Sofia: CSI loan YES but "closed for Fall 2026" | MAYBE (SSN unknown); no closed label | The approved record has no deadline date to mark closed. Add one in /admin if wanted |
| Sofia: counseling not shown | Not shown | Matches |
| PURF urgent, Town and Gown closes Nov 15 | Both automatic | |
