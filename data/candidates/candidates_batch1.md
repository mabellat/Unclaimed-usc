# Unclaimed: candidates, batch 1 (14 resources)

## Decision log (owner: Manoj, 2026-11-13)
- APPROVED by owner in chat: 1, 2, 3 (deadline kept as "September 9-30", term and year not specified), 4, 5, 6, 7, 8 (with the Google Form link), 10, 11, 12, 13, 14
- APPROVED 2026-11-13 ("approve all 26"): 9 (Immigration Clinic), including its source uscimmigrationclinic.org, which is not a usc.edu domain. data/sources.json must list it as an explicit owner-approved exception.
- These approvals are recorded here only. Records still go through the review tool (status, approved_by, approved_at, data_version) once it is built.

Status of every record below: PENDING. Nothing is approved until the owner says so.
Pulled 2026-11-13 from usc.edu pages. Each record has one short key quote; confirm every field against the source page before approving.
Fields with no source stay null.

---
## 1. csi-emergency-loan: CSI Emergency Loan
- category: cash | relevance: money
- benefit: up to $1,000; one loan per semester; repay within 90 days (10% annual interest after, then collections and a registration hold)
- eligibility: currently enrolled; good financial standing (no negative balance in collections); U.S.-issued Social Security number; documentation of the emergency; ability to repay
- deadline: page says the application is CLOSED for Fall 2026; no reopening date stated -> null
- source: https://campussupport.usc.edu/students/basic-needs/emergency-loan-application/
- key quote: "CSI may approve loans of up to $1000 per student."
- FLAGS: (a) USC OIS page says the loan is "available to F-1 or J-1 students with a Social Security number", which differs from "U.S.A. issued Social Security number" here. Check which is right. (b) Needs a "has SSN" yes/no field: sensitive; we never store the number.

## 2. sbn-supplemental-funding: Student Basic Needs Supplemental Funding
- category: cash | relevance: money, housing, food
- benefit: one-time financial assistance for housing, food, or medical/dental costs; amount NOT stated on the page -> null
- eligibility: enrolled at least half time in the term funds are requested; sudden financial distress from unforeseen circumstances; $0 bill balance; Financial Aid approval (SBN contacts Financial Aid for you); able to supply bills or receipts
- deadline: none stated -> null
- source: https://studentbasicneeds.usc.edu/programs-and-services/economic-support/
- key quote: "Have a $0 bill balance with the university"
- FLAGS: a 2024 GSG slide deck says up to $1,000 per academic year, but it is not an official page for this fund, so I did not use it. Check the amount with the office.

## 3. gsg-emergency-fund: GSG Emergency Fund Grant  [UPDATED per owner]
- category: cash | relevance: money
- benefit: up to $1,000 per student per academic year; paid in one lump sum, 6-8 weeks after approval (international students up to 3 months)
- eligibility: graduate student; paid the Graduate Student Programming Fee for the semester; member of the GSG EngageSC group. NOT covered: routine medical care, health insurance fees, basic needs (food, rent, utilities), tuition and fees
- deadline: owner read on the live page: "Fund applications are open September 9-30." (term and year to confirm; spring window not yet known -> null)
- source: https://engage.usc.edu/gsg/er-fund/
- key quote: "The funding limit is $1,000 per student per academic year."
- NOTE: this page is rendered by JavaScript, so my fetch tool cannot read the date text. The date comes from the owner's reading of the live page.

## 4. gsg-caretaker-subsidy: GSG Caretaker Subsidy Grant
- category: cash | relevance: caregiver
- benefit: up to $1,000 per semester, max $2,000 per year
- eligibility: USC graduate student (postdocs and undergraduates not eligible); paid the Graduate Student Programming Fee; primary caretaking responsibilities for a dependent (need not be the parent or legal guardian)
- deadline: page says spring cycle closed and next opens Fall 2026. It is now November 2026, so confirm whether it is open.
- source: https://engage.usc.edu/gsg/caretaker-grant/
- key quote: "Have primary caretaking responsibilities for a dependent."
- FLAGS: a 2024 slide deck says up to $1,800 per semester; I used the current page ($1,000).

## 5. gsg-travel-award: GSG Travel Award
- category: cash | relevance: conference
- benefit: $500 per student per academic year (AY Aug 2026 - May 2027); last-resort funding
- eligibility: registered graduate student at the time of request and disbursement; paid the Graduate Student Programming Fee; maximum one award per year, one application per semester. Covers conference registration, travel, accommodation, abstract fees; not tuition
- deadline: open application period, reviewed during the semester; dates not stated -> null
- source: https://engage.usc.edu/Gsg/gsg-ta/
- key quote: "$500 per student per academic year"
- FLAGS: (a) the page did not render for my fetch tool; this came from a search snippet. Verify on the live page. (b) The example in CLAUDE.md says $650; the page says $500, so fix the example. (c) The CS department page says the CS dept does not fund M.S. conference attendance, so this is the relevant fund for M.S. CS students.

## 6. gsg-empowerment-award: GSG Empowerment Award
- category: cash | relevance: conference
- benefit: up to $250 per student per academic year
- eligibility: registered graduate student; paid the Graduate Student Programming Fee; one award per academic year; for a past expense, the receipt must be dated within the last 6 months. Secondary to other funding.
- deadline: none stated -> null
- source: https://engage.usc.edu/Gsg/gsg-ea/
- key quote: "$250 per student per academic year"

## 7. trojan-food-pantry: Trojan Food Pantry
- category: basics | relevance: food
- benefit: limited groceries per week, free
- eligibility: enrolled at USC in the term; no active dining hall meal plan (students with 20 or fewer meals left may be considered); experiencing food insecurity. Intake form once per semester; physical USCard at every visit; bring a reusable bag
- hours: Fall/Spring Tue/Wed/Thu 10:00 AM - 2:00 PM, about 15 weeks from the first week of classes to Classes End week; Summer Wednesdays 11:00 AM - 2:00 PM (first week of June to last week of July)
- source: https://studentbasicneeds.usc.edu/programs-and-services/food-support/trojan-food-pantry/
- key quote: "Does not have an active dining hall meal plan"
- FLAGS: an older CSI page lists the location as STU 422; the SBN page and calendar say King Hall (KOH) 103. I used KOH 103.

## 8. free-legal-counseling: Free legal counseling (USG and GSG)  [UPDATED per owner]
- category: legal | relevance: legal, housing
- benefit: free 30-minute consultation; provided jointly by the undergraduate and graduate student governments, for USC students
- hours: Mondays 4:00 PM - 9:00 PM, at the USG Office, TCC Suite 224
- how to book: call USG at (213) 740-5620, or walk in (per USG page); older pages also say pre-registration is required
- eligibility: none stated beyond being a USC student
- source: https://usg.usc.edu/ (section "Free Legal Counseling Services"; the site has no dedicated URL for it)
- apply/booking link (owner-provided): https://docs.google.com/forms/d/e/1FAIpQLSfjrhPHhAlu-AcqUKyWsruoVKJWikSXXoaNCw2uSaXPO0WTjw/viewform (Google Form, not a usc.edu domain; used as a link only, never crawled)
- backup source: https://gsg.usc.edu/student-resources/ (hours match)
- key quote: "Free Legal Counseling Services"
- NOTE: no deep link exists, so the ticket's source points to the USG home page and names the section.

## 9. usc-immigration-clinic: USC Immigration Clinic (Gould School of Law)  [UPDATED per owner]
- category: legal | relevance: legal
- benefit: free legal consultations, assistance and referrals through the Immigrant Legal Assistance Center (ILAC); also DACA renewal help (USC First Generation Plus Success Center pays the renewal filing fee for current students, per the page)
- eligibility: members of the USC Trojan Family (students, staff) who may be at risk of deportation, may be eligible for status, or have immigration questions
- contact: iclinic@law.usc.edu; 213-821-5987 (main), 213-821-9627 (ILAC and DACA); schedule at https://calendly.com/usc-ilac; Mon-Fri 9:00 AM - 5:00 PM
- source: https://uscimmigrationclinic.org/
- key quote: "serves members of the USC Trojan Family"
- FLAGS: (a) uscimmigrationclinic.org is NOT a usc.edu domain, so the crawler's allowlist would reject it. It is staffed by USC Gould and supported by the Provost, so decide: add it as an owner-approved exception in data/sources.json, or keep the careers.usc.edu page. (b) The page's DACA fee amounts date from 2024; leave them out of the record. (c) The site's own phrasing has a typo; confirm the cost line on the live page.

## 10. career-advising-and-tools: Career Center advising and interview practice  [MERGED from old 10 and 11]
- category: career | relevance: job
- benefit: free resume, CV and cover letter critique at drop-in advising (about 15 minutes); 24/7 interview practice with Big Interview (students and alumni) and Quinncia (current students, mock interviews based on your resume)
- eligibility: students of all class levels and majors (drop-in); current students (Quinncia)
- hours: drop-in Fall and Spring, Monday-Friday 1:00 - 3:30 PM, Student Union 110; Summer: 15-minute resume reviews by appointment on Handshake
- source: https://careers.usc.edu/channels/appointments/
- key quote: "Drop-in advising is available in-person in STU 110 from 1:00-3:30 pm"

## 11. career-fest-2027: Career Fest and Employer Resume Review
- category: career | relevance: job
- benefit: week of workshops and panels; Employer Resume Review lets recruiters review your resume
- eligibility: all USC students (all majors and class levels)
- dates: Career Fest Mon Jan 25 - Fri Jan 29, 2027; Employer Resume Review Mon Jan 25, 2027, 9:00 AM - 12:00 PM PT, TCC Ballroom
- source: https://careers.usc.edu/channels/career-fest/
- key quote: "Career Fest will take place the week of Monday, January 25"

## 12. its-laptop-loaner: ITS Laptop Loaner Program
- category: basics | relevance: (open to everyone)
- benefit: free laptop for up to 4 hours at Leavey Library (Ahmanson Information Commons); late fee $20 per 30 minutes up to replacement cost
- eligibility: currently enrolled student with a valid USCard
- source: https://itservices.usc.edu/usc-computing-center-laptop-loaner-program/
- key quote: "only available to currently enrolled USC students with a valid USC Card"
- FLAGS: an older page says one 4-hour renewal is free; the newer page says it can be extended another 4 hours. Treat as 4 hours plus one extension and confirm.

## 13. surf-shure: Summer Undergraduate Research Fund (SURF) / SHURE
- category: scholarship | relevance: research
- benefit: up to $3,000 for summer research with a Dornsife faculty mentor
- eligibility: declared Dornsife major; minimum 3.0 cumulative USC GPA; full-time enrollment (12+ units each semester); not a senior graduating Summer/Fall 2027 and under 144 total units; has an eligible Dornsife faculty mentor; no overlapping PURF/ExL/Rose Hills funding
- deadline: Summer 2027 regular window Thursday March 4 - Thursday April 8, 2027. Window for approved Problems Without Passports courses: Oct 1 - Nov 5, 2026 (extended to Nov 9, 2026 for Fall 2026 admits only); that window has now passed.
- source: https://dornsife.usc.edu/css/surf/
- key quote: "up to $3,000 for the summer"
- FLAGS: Dornsife-only; relevant only to Dornsife majors.

## 14. soar: Student Opportunities for Academic Research (SOAR)
- category: scholarship | relevance: research
- benefit: up to $1,000 per academic year for fall/spring research assistance with a Dornsife faculty member
- eligibility: declared Dornsife major; 3.0 cumulative USC GPA; full-time enrollment; Dornsife faculty mentor; not funded together with PURF
- deadline: current dates not found -> null (the only dates I found are from 2017)
- source: https://dornsife.usc.edu/css/research-travel-internship/
- key quote: "up to $1,000 in funding through the SOAR program"
- FLAGS: find the current SOAR page for dates and details.

---
## Held for batch 2 (not yet checked)
PURF (amount sources disagree: $1,000 vs $3,000 per term), URAP, WiSE grants, CalFresh navigation, Tommy's Table, Emergency Meal Swipes, Tommy's Closet, Student Health / counseling services, school-specific emergency funds (Annenberg Student Success Fund, Price Student Success Fund, SCA Emergency Fund), Neuropsychological Evaluation Fund (GSG, up to $600), Housing Law Clinic, first-gen and veteran scholarships.
