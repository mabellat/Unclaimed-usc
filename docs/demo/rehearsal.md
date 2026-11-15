# Demo rehearsal (follows pitch_script.md)

## The morning of the demo
1. `make admin ADMIN_PASSWORD=...` and `make web`. Run them **on the demo laptop**, so venue Wi-Fi only affects Claude and the usc.edu re-check.
2. Optional: `make test` should end with "passed".
3. Open http://localhost:3000 in a phone-sized window (Chrome device toolbar, iPhone 14 Pro, 390 x 844).
4. If an old card loads, go to My card, then "Delete my card and restart".
5. Keep `docs/demo/backup/index.html` open in a second tab.

## Click path with timings
| Time | Say | Do |
|---|---|---|
| 0:00 | Hook (pitch) | Welcome screen |
| 0:20 | "This is Priya, a Dornsife junior." | Skip: load a demo student, then **Priya** |
| 0:30 | "We only ask what an approved rule needs. PURF is due November 19, so it is marked urgent." | Wallet: point at the scoreboard and the red **Due Nov 19** pill |
| 0:40 | "Two cards say maybe. We ask one question." | Gold card: **Do you have a Dornsife faculty mentor?**, then **Yes** |
| 0:45 | "SOAR and SURF turn to yes: $4,000 more. Nothing was guessed." | Watch the scoreboard climb |
| 0:55 | "She taps PURF." | PURF ticket: Why you qualify ("You told us"), the source link |
| 1:00 | "The claim agent re-checks the page, works out what she needs, drafts, and checks every statement against the source." | **Claim it for me**: live trace |
| 1:05 | "She reads it and sends it herself. Nothing is ever sent for her." | Packet: open "where each statement comes from", then **I sent it** |
| 1:10 | "We can't send real applications, so this part is simulated, and we say so." | Claims: **Day 7** (In review), **Day 30** (Received) |
| 1:40 | (optional) "Unknown is never no." | Wei: CSI Emergency Loan is a maybe; answer **No** to SSN; it no longer fits |
| 1:50 | Trust and feasibility (pitch) | Optional: `/admin` shows a record next to its source quote |

## If something breaks
| Problem | What happens / what to do |
|---|---|
| usc.edu unreachable | Automatic: the trace says it couldn't reach the page and the approved version is used |
| The app won't load | Switch to the `docs/demo/backup/index.html` tab and click through (16 real screenshots with captions) |

## Things that change by date
- **Town and Gown closes November 15, 2026.** After that, Marcus's ticket shows **Closed**, "Claim it for me" turns into a note, and the amount leaves the scoreboard. Don't demo Marcus's Town and Gown claim after the 15th.
- **PURF is due November 19, 2026.** After that it shows Closed too. Then use Marcus / Cavaney (opens Dec 1) or Sofia / Trojan Food Pantry for the claim demo.

## Suggested edits to pitch_script.md (not applied; your call)
- 0:20 to 1:10: replace "do you have financial need? She answers yes, and both turn to yes" with "do you have a Dornsife faculty mentor? She answers yes, and SOAR and SURF turn to yes." Financial need is an office judgment since step 2, so the app never asks it.
- 1:50: "[44] hand-verified" should be **45**.
- 2:30: "deployed today" is true only after hosting is set up. Until then, say "runs end to end on a laptop".
