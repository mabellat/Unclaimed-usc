# Three-minute pitch script (about 400 words, spoken pace)

Placeholders in [brackets]. Replace "44" with the real seeded count. Say the claims below only if they are true on demo day.

---

**[0:00 to 0:20] Hook (Impact)**
USC has set money and help aside: emergency funds, food, housing support, scholarships, free legal help. But it is spread across dozens of pages, each with its own rules and deadlines. Students miss what is theirs, usually when they need it most. We built Unclaimed. It finds what's yours, then an AI agent does the paperwork.

**[0:20 to 1:10] Demo, Day 1 (UX)**
This is Priya, a Dornsife junior. She picks her needs: money and research. We ask only what a resource actually needs. Right away she sees a PURF fellowship due November 19, marked urgent, with the exact line from the official page behind it. Two cards say "maybe". We ask one question: do you have financial need? She answers yes, and both turn to "yes". Nothing was guessed.

She taps one resource. The claim agent checks the source page, gathers what's needed, and drafts the message. Priya reads it, edits it, and sends it herself. Nothing is ever sent for her.

**[1:10 to 1:50] Demo, Day 7 and Day 30 (the demo clock)**
We can't send real applications to USC offices, so this part is simulated, and we say so. The demo clock jumps to Day 7: the request shows "In review". Day 30: "Received". Everything before that is real.

**[1:50 to 2:30] Why it is trustworthy (Technical and AI)**
The AI reads pages and drafts messages. It does not decide who qualifies. A rules engine does, with three answers: yes, maybe, or no. Unknown is never treated as no. Every record is [44] hand-verified: a person approved it against the source page and kept the quote. A nightly watcher re-checks the pages and flags changes for review.

**[2:30 to 2:55] Feasibility**
It runs on Next.js, FastAPI and Postgres, deployed today. It uses only public usc.edu pages. USC could adopt it by pointing its basic-needs and student-support teams at the same reviewed data, which they already own.

**[2:55 to 3:00] Close**
Money, food and help already exist. Unclaimed gets them to the student who needs them. Thank you.

---

## Slide notes (one line each)
1. Problem: help exists but is hard to find. Use one real example from the data.
2. Demo: Priya, Day 1.
3. Demo clock: Day 7 and Day 30, labelled "simulated".
4. How it works: AI drafts, rules decide, a human approves the data.
5. Feasibility: stack, public sources, and how USC would take it over.

## Likely judge questions
- **Is it real or fake?** Matching, sources and drafting are real. Only the review timeline is simulated, and it is labelled on screen.
- **Does it make things up?** The AI never decides eligibility, and every record has an approved quote.
- **What about privacy?** Sensitive fields are optional, asked only when needed, never inferred, and deletable.
- **Who maintains the data?** The watcher flags page changes and a person approves them.
