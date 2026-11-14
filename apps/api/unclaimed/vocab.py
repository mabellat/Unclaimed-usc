"""Closed vocabularies. Keep in sync with CLAUDE.md and the CHECK constraints in migrations."""

CATEGORIES = (
    "cash", "scholarship", "legal", "career", "basics",
    "health", "jobs", "academic_support", "transportation", "support_office", "community", "international",
)

NEEDS = (
    "money", "conference", "research", "caregiver", "housing", "legal", "job", "food",
    "wellbeing", "accessibility", "academics", "transport", "community", "international",
)

STATUSES = ("pending", "approved", "rejected", "superseded")
