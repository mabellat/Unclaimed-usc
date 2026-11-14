# Step 4 summary: web app screens

Status as of 2026-11-13: done. Every prototype screen runs on real approved data and the real matcher. API tests: 128 pass. Web: production build and typecheck pass. The full flow was driven in headless Chrome (welcome, build, scan, wallet, answer two questions, ticket, my card, claims, alerts, ask) with no errors.

## Run it
1. `make admin ADMIN_PASSWORD=...` (API on :8000; already running if you started it earlier)
2. `make web-setup` once, then `make web`
3. Open http://localhost:3000

## Screens
| Route | Screen |
|---|---|
| `/` | Welcome, with "Build my Trojan card" and "Skip: load a demo student" (loads Priya through the normal card API) |
| `/build` | 3 steps: degree level, school, what's going on |
| `/scan` | Rules check animation, then the wallet |
| `/wallet` | Flip-clock total, next-best question, "Yours to claim" tickets, "Might be yours" cards you can answer in place |
| `/ticket/[id]` | Why you qualify (with "You told us"), what's still needed, the office decides, how to claim, heads up, source and data version |
| `/claims` | Demo clock (Day 1 / 7 / 30), recap, claim tracks |
| `/alerts` | Alerts from the demo clock |
| `/ask` | Navigator chat UI |
| `/card` | Edit situations, level, school; every answer listed with Delete; delete the card |

## API added (apps/api/unclaimed/students.py, migration 0003)
- `POST /students` creates a card under a random id (no name, email or login). `DELETE /students/{id}` removes it and everything tied to it.
- `PUT/DELETE /students/{id}/facts/{field}` and `PUT /students/{id}/needs`. Only valid values for fields an approved rule uses; null is refused (unknown is a missing row).
- `GET /students/{id}/match?skip=` runs the matcher on the stored card. "Not now" skips a question without storing anything.
- `GET /profile/fields` lists only the questions approved rules use.
- Claims, demo clock and alerts: `GET /students/{id}/claims`, `POST .../claims/{rid}/sent`, `PUT .../clock`, `GET .../alerts`, `GET /demo/personas`.

## Honest gaps (filled in later steps)
- **"Claim it for me"** opens a placeholder until the Claim Agent (step 5). So Claims has nothing to show yet.
- **Ask** says plainly that the Navigator isn't connected yet (step 5).
- **Alerts** are simulated from the demo clock. Source-change alerts come with the Watcher (step 6).
- **"Add deadline to calendar"** is left out until step 5 (`create_ics`), and only where the page states a date.

## Where the build differs from the prototype, and why
- **Scan copy:** "Matching you against each office's approved rules", not "Reading each office's own eligibility page". The match uses approved data, not a live read.
- **Tickets with no stated amount** show a word (FUNDS, AWARD, HELP...) instead of the prototype's "FREE", because no amount is invented.
- **The veteran chip** is not a situation; veteran is a sensitive community answer asked only when a rule needs it.
- **Schools** list the five a rule uses (Marshall and Cinematic Arts are "Another school" until a rule needs them).
- **Added:** the "Why we ask" line on sensitive questions, "Prefer not to say", the "Everything you told us" list with Delete, and "The office decides" on tickets.
