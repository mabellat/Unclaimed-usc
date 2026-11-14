"""Read a deadline date from an approved deadline label. A date is returned only when the label
states one unambiguously (month, day and year, marked as the due date or the only date). Never guessed."""

import re
from datetime import date

MONTHS = "january february march april may june july august september october november december".split()
DATE = re.compile(r"\b(" + "|".join(MONTHS) + r")\s+(\d{1,2}),\s*(\d{4})", re.I)
DUE = re.compile(r"(due|deadline|closes?|by|before|until)\W+(\w+\W+){0,3}$", re.I)
URGENT_DAYS = 14


def parse_deadline(label: str | None) -> date | None:
    if not label:
        return None
    found = []
    for m in DATE.finditer(label):
        try:
            d = date(int(m.group(3)), MONTHS.index(m.group(1).lower()) + 1, int(m.group(2)))
        except ValueError:
            continue
        found.append((d, bool(DUE.search(label[: m.start()]))))
    due = [d for d, is_due in found if is_due]
    return due[-1] if due else (found[0][0] if len(found) == 1 else None)


def deadline_status(label: str | None, today: date | None = None) -> dict | None:
    """{label, date, closed, days_left} for the API. closed only when the stated date has passed."""
    if not label:
        return None
    today = today or date.today()
    d = parse_deadline(label)
    return {"label": label, "date": d.isoformat() if d else None,
            "closed": bool(d and d < today), "days_left": (d - today).days if d else None}
