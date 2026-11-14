"""Crawler allowlist: usc.edu and its subdomains, plus the owner-approved exceptions in data/sources.json."""

import json
from functools import cache
from urllib.parse import urlsplit

from unclaimed import DATA

SOURCES_FILE = DATA / "sources.json"


@cache
def load_sources() -> dict:
    return json.loads(SOURCES_FILE.read_text())


def exception_hosts() -> set[str]:
    return {e["domain"] for e in load_sources()["exceptions"]}


def is_allowed(url: str) -> bool:
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or parts.username or parts.password:
        return False
    host = (parts.hostname or "").rstrip(".")
    if host == "usc.edu" or host.endswith(".usc.edu"):
        return True
    return host.removeprefix("www.") in exception_hosts()
