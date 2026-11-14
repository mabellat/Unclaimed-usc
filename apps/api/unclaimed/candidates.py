"""Parse the owner's candidate files (data/candidates/*.md) into pending resource dicts.

Text is copied verbatim. A value the file leaves null or unclear stays None.
Values the owner asked us to propose (category, relevance, title, provider where the
file has none) are listed in proposed_fields so the review tool shows "proposed, check".
"""

import re
from pathlib import Path

from unclaimed import DATA
from unclaimed.vocab import CATEGORIES, NEEDS

CANDIDATES_DIR = DATA / "candidates"
SKIP = {34}  # rejected by owner: no verifiable source
LAST_VERIFIED = "2026-11-13"
VERIFICATION_NOTE = "fields verified by owner against the source page, 2026-11-13"

# Owner-requested proposals (2026-11-13). Used only where the file has no usable value.
PROVIDERS = {
    "csi-emergency-loan": "Campus Support and Intervention",
    "sbn-supplemental-funding": "Student Basic Needs",
    "gsg-emergency-fund": "Graduate Student Government",
    "gsg-caretaker-subsidy": "Graduate Student Government",
    "gsg-travel-award": "Graduate Student Government",
    "gsg-empowerment-award": "Graduate Student Government",
    "trojan-food-pantry": "Student Basic Needs",
    "free-legal-counseling": "USG and GSG",
    "usc-immigration-clinic": "USC Gould School of Law",
    "career-advising-and-tools": "Career Center",
    "career-fest-2027": "Career Center",
    "its-laptop-loaner": "USC IT Services",
    "surf-shure": "Dornsife",
    "soar": "Dornsife",
    "purf": "Academic Programs",
    "emergency-meal-swipes": "Student Basic Needs",
    "tommys-table": "Student Basic Needs",
    "tommys-closet": "Student Basic Needs",
    "calfresh-navigation": "Student Basic Needs",
    "sbn-housing-support": "Student Basic Needs",
    "counseling-and-mental-health": "Student Health",
    "osas-accommodations": "Office of Student Accessibility Services",
    "gsg-npe-fund": "Graduate Student Government",
    "annenberg-emergency-aid": "Annenberg",
    "financial-aid-appeal": "Financial Aid",
    "sbn-financial-navigation": "Student Basic Needs",
    "town-and-gown": "Price School of Public Policy",
    "dornsife-continuing-student-scholarship": "Dornsife",
    "exl-award": "Dornsife",
    "skull-and-dagger": "Dornsife",
    "half-century-trojans": "Dornsife",
    "cavaney-vet": "Price School of Public Policy",
    "viterbi-continuing-undergrad": "Viterbi School of Engineering",
    "ship-insurance-waiver": "Student Health",
    "student-health-services": "Student Health",
    "federal-work-study": "Financial Aid",
    "on-campus-jobs-handshake": "Career Center",
    "writing-center": "Dornsife Writing Center",
    "viterbi-learning-program": "Viterbi School of Engineering",
    "metro-u-pass": "USC Transportation",
    "usc-lyft-rides": "USC Transportation",
    "campus-support-and-intervention": "Campus Support and Intervention",
    "first-generation-plus-success-center": "First Generation Plus Success Center",
    "ois-work-authorization-advising": "Office of International Services",
}

# Records whose heading has no title (batches 3 and 4).
TITLES = {
    "town-and-gown": "Town and Gown Scholarship",
    "dornsife-continuing-student-scholarship": "Dornsife Continuing Student Scholarship",
    "exl-award": "Dornsife ExL Award",
    "skull-and-dagger": "Skull and Dagger Scholarship",
    "half-century-trojans": "Half Century Trojans Scholarship",
    "cavaney-vet": "Cavaney Graduate Veteran Scholarship",
    "viterbi-continuing-undergrad": "Viterbi Continuing Undergraduate Scholarship",
    "ship-insurance-waiver": "SHIP insurance waiver",
    "student-health-services": "Student Health medical care",
    "federal-work-study": "Federal Work-Study",
    "on-campus-jobs-handshake": "On-campus jobs on Handshake",
    "writing-center": "Writing Center",
    "viterbi-learning-program": "Viterbi Learning Program",
    "metro-u-pass": "Metro U-Pass",
    "usc-lyft-rides": "USC Lyft rides",
    "campus-support-and-intervention": "Campus Support and Intervention",
    "first-generation-plus-success-center": "First Generation Plus Success Center",
    "ois-work-authorization-advising": "OIS work authorization advising",
}

# Category where the file's value is not one of CATEGORIES (batch 4: "academic support", "support office").
CATEGORY_PROPOSALS = {
    "writing-center": "academic_support",
    "viterbi-learning-program": "academic_support",
    "campus-support-and-intervention": "support_office",
}

# Relevance where the file has none (batches 3 and 4). [] means open to everyone.
RELEVANCE_PROPOSALS = {
    "town-and-gown": ["money"],
    "dornsife-continuing-student-scholarship": ["money"],
    "exl-award": ["money"],
    "skull-and-dagger": ["money"],
    "half-century-trojans": ["money"],
    "cavaney-vet": ["money"],
    "viterbi-continuing-undergrad": ["money"],
    "ship-insurance-waiver": ["money"],
    "student-health-services": ["wellbeing"],
    "federal-work-study": ["money", "job"],
    "on-campus-jobs-handshake": ["job"],
    "writing-center": ["academics"],
    "viterbi-learning-program": ["academics"],
    "metro-u-pass": ["transport"],
    "usc-lyft-rides": ["transport"],
    "campus-support-and-intervention": [],
    "first-generation-plus-success-center": ["community"],
    "ois-work-authorization-advising": ["international", "job"],
}

# Where the file text cannot be copied as is. Each entry cites the file's own instruction.
OVERRIDES = {
    # Decision log, batch 1: 'deadline kept as "September 9-30", term and year not specified'.
    "gsg-emergency-fund": {"deadline_label": "Fund applications are open September 9-30."},
    # The text says to confirm whether the cycle is open; unclear, so null.
    "gsg-caretaker-subsidy": {"deadline_label": None},
    # Record flag: "keep the location out of the record unless the owner confirms it".
    "writing-center": {"where": "ongoing during the term"},
    # Record text gives the label in quotes and an explicit value 4750.
    "federal-work-study": {"benefit_label": "$500 to $4,750 per year", "benefit_value": 4750},
}

HEADING = re.compile(r"^## (\d+)\. ([a-z0-9-]+)(?:\s*\([^)]*\))?(?::\s*(.*))?$")
FIELD = re.compile(r"^- ([^:]+?)(?: \([^)]*\))?:\s*(.*)$")
URL = re.compile(r"https?://[^\s,)]+")
AMOUNT = re.compile(r"\$[\d,]+")


def _split_top_level(s: str, sep: str = ";") -> list[str]:
    """Split on sep, ignoring separators inside parentheses or quotes."""
    parts, depth, quoted, cur = [], 0, False, ""
    for ch in s:
        if ch == '"':
            quoted = not quoted
        elif ch == "(":
            depth += 1
        elif ch == ")":
            depth = max(depth - 1, 0)
        if ch == sep and depth == 0 and not quoted:
            parts.append(cur)
            cur = ""
        else:
            cur += ch
    parts.append(cur)
    return [p.strip() for p in parts if p.strip()]


def _criteria(prose: str, sep: str = ";") -> list[dict]:
    """Prose criteria only. field=None means the matcher treats each as unknown until structured."""
    parts = _split_top_level(prose, sep) if sep == ";" else [p.strip() for p in prose.split(sep)]
    return [{"text": p, "field": None, "op": None, "value": None, "evidence_quote": None, "source_url": None}
            for p in parts]


def _benefit_value(label: str | None) -> int | None:
    """A value only when the label states exactly one amount, as "$X..." or "up to $X"."""
    if not label:
        return None
    amounts = AMOUNT.findall(label)
    if len(amounts) != 1 or not re.search(r"(^|up to )\$[\d,]+", label):
        return None
    return int(amounts[0][1:].replace(",", ""))


def _clean(s: str) -> str:
    return s.replace("**", "").strip()


def parse_blocks(path: Path) -> list[tuple[int, str, str | None, list[str]]]:
    """(number, slug, heading title, block lines) for every record heading in a file."""
    blocks, cur = [], None
    for line in path.read_text().splitlines():
        m = HEADING.match(line)
        if m:
            cur = (int(m.group(1)), m.group(2), m.group(3), [line])
            blocks.append(cur)
        elif line.startswith("## ") or line.strip() == "---":
            cur = None
        elif cur is not None:
            cur[3].append(line)
    return blocks


def parse_record(path: Path, number: int, slug: str, heading_title: str | None, lines: list[str]) -> list[dict]:
    fields: dict[str, str] = {}
    children: dict[str, list[str]] = {}
    last_key = None
    for line in lines[1:]:
        if line.startswith("  - ") and last_key:
            children.setdefault(last_key, []).append(line.strip()[2:])
            continue
        m = FIELD.match(line)
        if m:
            last_key = m.group(1).strip().lower()
            fields[last_key] = _clean(m.group(2))
        elif line.strip() and last_key:
            fields[last_key] += " " + _clean(line)

    proposed, flags = [], []
    is_batch4 = path.name == "candidates_batch4.md"

    title = re.sub(r"\s*\[.*\]\s*$", "", heading_title or "").strip() or None
    if title is None:
        title = TITLES.get(slug)
        proposed.append("title")
    provider = PROVIDERS.get(slug)
    proposed.append("provider")

    # "category: cash | relevance: money" (batches 1-2) or "category: health / money" (batch 4)
    cat_text, _, rel_text = fields.pop("category", "").partition("| relevance:")
    category = cat_text.strip().split(" ")[0]
    if category not in CATEGORIES:
        category = CATEGORY_PROPOSALS[slug]
        proposed.append("category")
    if rel_text.strip():
        rel = re.sub(r"\([^)]*\)", "", rel_text)
        relevance = [n.strip() for n in rel.split(",") if n.strip()]
    else:
        relevance = RELEVANCE_PROPOSALS[slug]
        proposed.append("relevance")
    unknown_needs = set(relevance) - set(NEEDS)
    assert not unknown_needs, f"{slug}: needs not in vocab: {unknown_needs}"

    benefit_label = fields.pop("benefit", None) or fields.pop("benefit label", None)

    deadline_label, where_parts, steps = None, [], []
    for key in ("deadline", "window", "dates", "timing"):
        if key not in fields:
            continue
        value = fields.pop(key)
        if re.search(r"\bnull\b", value):
            flags.append(f"Deadline text in candidate ({key}): {value}")
        elif key == "window" and is_batch4:
            # In batch 4, "window" says when and where a service runs, not an application deadline.
            where_parts.append(value)
        else:
            deadline_label = value
    for key in ("hours", "contact"):
        if key in fields:
            where_parts.append(fields.pop(key))
    for key in ("how to book", "how to apply", "how to get alerts", "time-slot sign-up", "apply/booking link"):
        if key in fields:
            steps.append({"text": fields.pop(key), "evidence_quote": None})

    source_text = fields.pop("source", None) or fields.pop("sources", None) or ""
    urls = URL.findall(source_text)
    leftover = URL.sub("", source_text).strip(" ;,")
    if leftover:
        flags.append(f"Source note: {source_text}")

    evidence_quote = fields.pop("key quote", "").strip().strip('"').strip() or None
    eligibility_text = fields.pop("eligibility", None) or fields.pop("eligibility rules", None)
    academic_year = fields.pop("academic year", None)

    for key in ("flags", "note", "decision", "field"):
        if key in fields:
            flags.append(f"{key.upper()}: {fields.pop(key)}")
    rules = children.pop("two rules, stored separately", None)
    fields.pop("two rules, stored separately", None)
    for key, value in fields.items():
        flags.append(f"Unmapped '{key}': {value}")

    base = {
        "id": slug,
        "title": title,
        "provider": provider,
        "category": category,
        "relevance": relevance,
        "benefit_label": benefit_label,
        "benefit_value": _benefit_value(benefit_label),
        "eligibility": _criteria(eligibility_text) if eligibility_text else [],
        "deadline_label": deadline_label,
        "academic_year": academic_year,
        "where": "; ".join(where_parts) or None,
        "steps": steps,
        "docs": [],
        "note": None,
        "source_url": urls[0] if urls else None,
        "evidence_quote": evidence_quote,
        "last_verified": LAST_VERIFIED,
        "owner_verified": True,
        "verification_note": VERIFICATION_NOTE,
        "proposed_fields": proposed,
        "candidate_ref": f"{path.name} #{number:02d}",
        "candidate_text": "\n".join(lines),
    }
    base.update(OVERRIDES.get(slug, {}))

    if rules is None:
        base["flags"] = "\n".join(flags) or None
        return [base]
    return _split_by_level(base, rules, urls, flags)


def _split_by_level(base: dict, rules: list[str], urls: list[str], flags: list[str]) -> list[dict]:
    """Record 25: owner decision to store the undergraduate and graduate rules as two records."""
    out = []
    for rule in rules:
        m = re.match(r'(UNDERGRADUATE|GRADUATE) rule: eligibility = (.*?)\. Benefit label: "(.*?)"', rule)
        assert m, f"cannot parse rule: {rule}"
        level = m.group(1).lower()
        source = next(u for u in urls if ("undergraduate" in u) == (level == "undergraduate"))
        out.append(base | {
            "id": f"{base['id']}-{'undergrad' if level == 'undergraduate' else 'grad'}",
            "title": f"Financial aid special circumstances appeal ({level})",
            "benefit_label": m.group(3),
            "benefit_value": None,
            "eligibility": _criteria(m.group(2), sep=" AND "),
            "source_url": source,
            "flags": "\n".join(flags + [f"Split from candidate 25 ({level} rule), owner decision 2026-11-13."]),
        })
    return out


def load_candidates(directory: Path = CANDIDATES_DIR) -> list[dict]:
    records = []
    for path in sorted(directory.glob("candidates_batch*.md")):
        for number, slug, title, lines in parse_blocks(path):
            if number not in SKIP:
                records.extend(parse_record(path, number, slug, title, lines))
    return records
