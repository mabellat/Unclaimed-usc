# Demo personas and expected results (draft for owner sign-off)

Purpose: five fixed profiles for the demo and for the matching tests. The owner signs off on the expected results before they become test fixtures.

How to read the results:
- YES, MAYBE and NO follow CLAUDE.md "Matching semantics". Unknown never counts as false, and nothing is YES while any criterion is unknown.
- Each expected result is based on the approved record's rules. If a record's real rule differs from what is written here, **the record wins and the fixture changes**, not the engine.
- Deadlines come only from the approved records. "Null" means no deadline is shown.
- Only rows marked **[test]** are asserted in automated tests. The rest are for the demo.

---

## 1. Priya: Dornsife junior, first-gen (the "money and research" demo)

Profile: undergraduate, Dornsife major, about 85 units, cumulative GPA 3.4, enrolled 12+ units, U.S. citizen, first-generation, not graduating in December 2026. Financial need left **unknown** at the start. Wants: money, research, jobs.

| Resource | Expected | Why |
|---|---|---|
| purf **[test]** | YES, due Nov 19, 2026, show as urgent | 64+ units, GPA 3.0+, 12+ units, undergraduate |
| dornsife-continuing-student-scholarship **[test]** | YES, opens January 2027, deadline null | Dornsife major, full-time, GPA 3.0+ |
| exl-award **[test]** | MAYBE, next question "Do you have demonstrated financial need?" | financial need unknown |
| federal-work-study | MAYBE | need unknown |
| soar, surf-shure | YES, with a "cannot be combined with PURF or ExL" note | Dornsife major, GPA 3.0+ |
| first-generation-plus-success-center | YES | first-generation |
| town-and-gown | MAYBE, next question about Southern California residency | residency unknown; due Nov 15, 2026 |
| gsg-emergency-fund, gsg-travel-award | NO | graduate students only |
| cavaney-vet **[test]** | NO | not a veteran and not a Price master's student |

Demo moment: answer "yes" to financial need. ExL and Work-Study flip from MAYBE to YES with no other change. This shows how a maybe is resolved by asking.

## 2. Wei: international MS CS student (the "unknown is not no" demo)

Profile: graduate, Viterbi, F-1, GPA 3.7, full-time. U.S. Social Security number **unknown**. Wants: work authorization, career, money.

| Resource | Expected | Why |
|---|---|---|
| ois-work-authorization-advising **[test]** | YES | F-1 student |
| career-advising-and-tools, career-fest-2027 | YES | all students |
| csi-emergency-loan **[test]** | MAYBE, next question "Do you have a U.S. Social Security number?" | record rule reads "F-1/J-1 with SSN"; SSN unknown |
| federal-work-study **[test]** | NO | international students are not eligible |
| town-and-gown | NO | needs U.S. citizen or permanent resident |
| viterbi-continuing-undergrad, dornsife-* | NO | undergraduate and Dornsife only |
| ship-insurance-waiver, metro-u-pass | YES | all students |

Demo moment: answer "no SSN". The emergency loan flips from MAYBE to NO, with the reason shown. Nothing was guessed.

## 3. Marcus: Price master's student, veteran (the "deadline" demo)

Profile: graduate, Price MPP, U.S. citizen, Southern California resident, GPA 3.5, veteran.

| Resource | Expected | Why |
|---|---|---|
| cavaney-vet **[test]** | YES, opens Dec 1, 2026, deadline March 21, 2027 | veteran and Price master's |
| town-and-gown **[test]** | YES, due Nov 15, 2026 | citizen, Southern California resident, GPA 3.4+ |
| skull-and-dagger | MAYBE, deadline null | leadership is judged by a committee, so the engine cannot decide it |
| federal-work-study | MAYBE | need unknown |
| gsg-travel-award, gsg-empowerment-award | YES | graduate student |

Note: Town and Gown needs the owner's live check before the demo. If the deadline has passed by demo day, the card must show "closed", not "yes".

## 4. Sofia: commuter undergrad in a basic-needs crisis (the "empathy and urgency" demo)

Profile: undergraduate, U.S. citizen, commutes, skipping meals, unstable housing. She selected the needs "food", "housing" and "transport". She did **not** opt into wellbeing questions.

| Resource | Expected | Why |
|---|---|---|
| trojan-food-pantry **[test]** | YES, with hours and location | food need |
| tommys-table, emergency-meal-swipes | YES | food need |
| sbn-housing-support **[test]** | YES | housing need |
| sbn-financial-navigation | YES | money need |
| calfresh-navigation **[test]** | MAYBE and never YES | eligibility is decided by the county |
| csi-emergency-loan | YES but shown as "closed for Fall 2026" | the record says the window is closed |
| metro-u-pass, usc-lyft-rides | YES | transport need |
| counseling-and-mental-health **[test]** | not shown | wellbeing is sensitive and was not opted into |

Demo moment: the packet for the food pantry or housing support is drafted with the claim agent, and Sofia reviews it before anything is sent.

## 5. Blank: "I'm a student, I need money" (the no-invention test)

Profile: only the need "money". Every other field unknown.

| Resource | Expected | Why |
|---|---|---|
| any resource with an unknown criterion **[test]** | never YES; MAYBE with the next best question | unknown is not false |
| ranking **[test]** | by value first, then specificity | owner decision |
| sensitive questions **[test]** | none asked | only asked when a resource needs them, with a "why we ask" line |

---

## Sign-off questions for the owner
1. Is Priya's ExL "maybe, then yes" the right demo moment, or should the demo use Wei's SSN question?
2. Should Sofia's persona appear in the live demo? It is the strongest emotional case, but the most sensitive.
3. Do you want the test rows marked **[test]** to be exactly these, or fewer?
