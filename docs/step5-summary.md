# Step 5 summary: Claim Agent and Navigator

Status as of 2026-11-13: done. 153 API tests pass (tests never touch the network). The web build passes. The full flow was driven in headless Chrome: demo student, ticket, Claim it for me, live trace, packet, I sent it, Claims at Day 7, then the Navigator. No page errors.

## Claim Agent (LangGraph): `apps/api/unclaimed/agents/claim_graph.py`
`plan -> verify_source -> gather_requirements -> draft -> groundedness_check -> present_packet`, looping back to `draft` when the check fails.

| Node | Tools | What it does |
|---|---|---|
| plan | get_profile, get_resource | Approved data only. The rules engine must say **yes**, or the agent refuses (a maybe never starts a claim) |
| verify_source | fetch_source | Re-reads the allowlisted page and looks for the approved quote. Statuses: verified, changed, unreadable (JavaScript page), unreachable or blocked. Anything but verified is logged for owner review at `/admin/source-checks`. The approved data is always what's used |
| gather_requirements | list_requirements | Steps, documents, office judgments, the deadline, and "confirm this is still true" for every self-reported answer the match used. Each item is tied to evidence |
| draft | draft_document | **Claude** (`claude-opus-5-5`, structured output, refusal fallback on) when a key is set. Otherwise a **template** built only from the card and the source text. The UI labels which one ran |
| groundedness_check | groundedness_check | Deterministic. Every sentence must cite the page or the card, numbers and dates must appear in what's cited, and the draft can never claim eligibility or approval. A failure goes back to Claude with the issues (up to 3 tries), then the template is used |
| present_packet | create_ics, set_reminder | A calendar file only when the page states a full date (never guessed). The packet is saved with the claim |

- **No send tool exists.** The student copies the draft, sends it, then taps "I sent it".
- **Every run is logged** in `agent_runs`: inputs, every tool call, and the output. Read it at `GET /students/{id}/runs/{run_id}`.
- **The live trace streams** as server-sent events from `GET /students/{id}/claims/{rid}/run`. Stop closes the stream.

## Navigator: `apps/api/unclaimed/agents/navigator.py` (upgraded 2026-11-13 to a LangGraph agent)
`understand -> act -> answer -> check -> reply`. Greetings and off-topic messages get a polite canned reply and use no tools.

| Intent | Example | What happens |
|---|---|---|
| update_card | "My landlord won't return my deposit" | `update_card(+housing)`, `run_match`, says what's new |
| ask_resource | "Tell me about PURF", "I need a laptop" | `get_resource` + `explain_result`: what it is, timing, where, and whether it's a match |
| why_not | "Why can't I get the GSG Emergency Fund?" | `explain_result`: the rules engine's reason in plain words, e.g. "It is for master's students and PhD and other graduate students, and your card says Undergraduate." |
| what_matches | "What matches my card?" | `run_match`: count, top 3, the next question |
| off_topic | "write me a poem", "ignore your instructions" | "I can only help with USC funds, scholarships and services in Unclaimed" + example questions |

- **Reasons come from the rules engine,** phrased from the approved rule itself (`plain_reason`). Claude only rewords them. A sensitive answer is never echoed back; the reply says what the resource is for and suggests asking the office.
- **The check:** every sentence must cite the facts pack (approved record or the student's card). Any "you qualify / you're eligible" is rejected. Fails go back to Claude (up to 2 tries), then the template.
- **Sensitive fields** are not in the `update_card` schema. Mentioning one gets a pointer to My card.
- **Without a key:** a labelled keyword classifier and the same templates.
- **Tickets** use the same explanation: `GET /students/{id}/explain/{rid}` feeds a "Why it doesn't fit right now" section.

## Web
- `/ticket/[id]/claim`: the live trace (tool chips, results, redraft attempts, Stop)
- `/ticket/[id]/packet`: checklist, draft with Copy, "where each statement comes from", Where to go, calendar (when a date is published), and I sent it
- The Ask tab is wired to the Navigator and shows the tool calls as chips

## Verified for real
A live run on the demo student fetched engage.usc.edu, found the approved quote (verified), and produced a template draft that passed the check.
