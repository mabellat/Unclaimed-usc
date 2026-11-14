"""The polite follow-up a student can send when an office hasn't replied. It states no facts
beyond the resource's approved title, so it needs no groundedness check."""


def followup_text(title: str) -> str:
    return (f"Hello, I sent my request for the {title} a little while ago and wanted to check whether "
            "you need anything else from me. Thank you for your time.")
