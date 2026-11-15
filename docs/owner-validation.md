# Owner validation checklist

The owner validates these after the full build. Each item says where to look and what to do.

## Step 2: structured eligibility (already approved in /admin)
- [ ] Check these calls in `docs/step2-summary.md`, "Calls made while building": the three-value degree level, multi-select schools, units_load, Federal Work-Study (only F-1/J-1 excluded), and the office judgments for the food pantry, CSI loan and SBN funding.

## Step 3: matcher
- [ ] Golden results: read each profile's `summary` and `expected` in `data/golden_profiles.json`, then set `signed_off_by` and `signed_off_at`.
- [ ] Optional: tidy rule texts that read oddly as a student-facing "why" (e.g. free legal counseling: "none stated beyond being a USC student"). Edit in /admin, then run `make export-approved` and `make test`.

## Step 4: web app
- [ ] Walk the app (`make web`): build a card, then load the demo student. Check the copy and that it matches the prototype's look.
- [ ] Copy changes from the prototype, listed in `docs/step4-summary.md` ("Where the build differs").
- [ ] Need labels for the six new situations (e.g. "Getting around LA", "Looking for my community") in `apps/web/src/lib/ui.ts`.
- [ ] Some steps and benefit texts read as copied criteria (e.g. GSG Emergency Fund step "Member of the GSG EngageSC group"). Reword in /admin if you like.

## Step 5: agents
- [ ] With your key set, run a claim and read Claude's draft and the "where each statement comes from" list.
- [ ] Review `/admin/source-checks` after a few runs (JavaScript-only pages such as some engage.usc.edu ones show as "unreadable").
- [ ] Try the Navigator with the AI model on: plain-language messages, a sensitive one ("I'm on an F-1"), and nonsense.

## Setup at the end (infra and resources)
| What | Where | Notes |
|---|---|---|
| `GEMINI_API_KEY` (or `ANTHROPIC_API_KEY`) | API environment | Turns on the AI model for the draft, the Navigator and the Watcher. Without it, the labelled template and keyword paths run |
| `GEMINI_MODEL` / `UNCLAIMED_MODEL` (optional) | API | Default `gemini-flash-latest` (Claude: `claude-opus-5-5`) |
| `DATABASE_URL` | API | Hosted Postgres, then `make migrate` |
| `ADMIN_USER`, `ADMIN_PASSWORD` | API | The review tool. Add CSRF protection before exposing `/admin` publicly |
| `WEB_ORIGINS` | API | The deployed web URL, for CORS |
| `NEXT_PUBLIC_API_URL` | Web (Vercel) | The deployed API URL |
| Outbound HTTPS to usc.edu and uscimmigrationclinic.org | API host | For `fetch_source` |

## Step 6: Watcher
- [ ] Fix 3 records flagged by the first real crawl (details in `docs/step6-summary.md`): two paraphrased evidence quotes (financial-aid-appeal-grad, usc-immigration-clinic) and the usg.usc.edu source for free-legal-counseling. They are listed at `/admin/source-checks`. To fix a quote, open the approved record in /admin, click "Start a new version to edit", fix it, then approve. Then run `make export-approved` and `make test`.
- [ ] With your key set, run `make watch` after a page changes and review the pending version it proposes (Flags explain each change).
- [ ] Hosting: run `make watcher` (or `make watch` from cron) next to the API, with outbound HTTPS to the allowlisted domains.

## Step 7: demo
- [ ] Sign off `data/demo_personas.json` (set `signed_off_by`). Differences from your draft are listed in `docs/step7-summary.md`.
- [ ] Decide on the pitch edits in `docs/demo/rehearsal.md` (financial-need line, 44 vs 45, "deployed today").
- [ ] With your Gemini key set: run `make demo-check` so the cached demo drafts are the AI's, not the template.
- [ ] Record a screen capture of one rehearsal (QuickTime, Cmd+Shift+5) into `docs/demo/backup/`.
- [ ] Re-run `make demo-backup` after any copy or data change.

## Navigator upgrade (2026-11-13)
- [ ] With your key set, try: "Why can't I get the GSG Emergency Fund?", "Tell me about PURF", "What matches my card?", "I'm on an F-1 visa", and nonsense. Check the tone of the "why not" answers.
- [ ] Decision recorded in CLAUDE.md: students can now see why something doesn't fit, in plain words, from the rules engine.

## Enrolled by default (owner decision 2026-11-14)
Everyone using Unclaimed is a current USC student, so a new card starts with "currently enrolled: yes" and the builder does not ask it. It stays self-reported (the office checks enrollment), shows on My card, and can be deleted there.

## Footer disclaimer removed (owner decision 2026-11-14)
The owner asked to remove "Sample data from public usc.edu pages. Not official or USC-affiliated." from both apps. The website footer now shows the Unclaimed logo and "Find what's yours." CLAUDE.md's design section still lists the footer note; update it if this is final.

## Minimal redesign (owner decision 2026-11-14)
The owner asked for a completely different look from the prototype. Both apps now use a minimal black-and-white theme: Bricolage Grotesque headlines, Hanken Grotesk body text, JetBrains Mono labels and numbers, USC cardinal and gold as the only accents, thin borders instead of heavy shadows, and no rings, scallops, perforations or skyline. Tokens live in apps/web/tailwind.config.ts. CLAUDE.md's "Design" section and "match the prototype" rule still describe the old look; update them if this is final.
