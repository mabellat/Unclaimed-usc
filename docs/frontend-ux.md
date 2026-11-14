# Frontend UX

This pass keeps the cardinal, gold and paper palette, Fraunces/Inter/Oswald typography, perforated tickets, scalloped headers, Trojan card and claim stamp from the original design.

The main principles are:

- **One clear next step.** The welcome screen prioritizes finding matches. Demo students are secondary. Each onboarding question has an explicit Continue action, and ready results open immediately.
- **Ask only what is needed.** Questions use the existing approved field definitions. Students can skip; skipped answers stay unknown. Returning to a question preserves its selection until the student changes or skips it.
- **Show the essentials first.** The wallet separates matches from resources needing answers and supports search within each view. Published amounts and application preparation details are expandable. Existing matching and ranking rules are unchanged.
- **Keep the student in control.** Matches are based on self-reported answers and need office confirmation. “Prepare my application” explains that students review and send themselves. Published totals are not presented as guaranteed payouts.
- **Make recovery clear.** Failed saves retain selections, failed answers show an inline error, loading failures offer a retry action, and empty searches explain how to recover.
- **Support touch and keyboard use.** Controls retain 44px minimum heights, onboarding focuses each new heading, focus rings work on light and dark surfaces, bottom controls account for device safe areas, and the existing reduced-motion behavior remains.

## Validation

From `apps/web`:

```sh
npm run typecheck
npm run build
npm run start
# In another terminal:
npm run test:ux
```

The browser smoke check uses Puppeteer and intercepted API responses with the repository's field definitions and approved resource snapshot. It checks explicit onboarding progression, back/skip behavior, failed save recovery, unknown answers, wallet search, question resolution, returning students, legacy scan redirects, failed loading/retry, and overflow at 320px, 390px and 1280px. It does not validate the live backend or eligibility engine.

`CHROME_PATH` selects a Chrome executable (default `/usr/bin/google-chrome`); `WEB_URL` changes the site URL. Screenshots go to `/tmp/unclaimed-ux` by default, configurable with `UX_SCREENSHOTS`. The existing demo recorder has been updated for the new labels and wallet flow; recording it still requires the live API and configured demo data.
