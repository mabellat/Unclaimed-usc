"""Cached Claim Agent runs for the demo personas, written by `make demo-check`.

Two uses, both labelled on screen:
  - fallback: if the AI model can't be reached during a live demo run, the cached AI draft for the
    same persona, resource and data version is used, and it still goes through the groundedness check;
  - replay (UNCLAIMED_DEMO_REPLAY=1): the whole cached run is replayed, for a demo with no network.
"""

import json
import os
from datetime import datetime, timezone

from unclaimed import DATA

CACHE_DIR = DATA / "demo_cache"


def path(persona: str, resource_id: str):
    return CACHE_DIR / f"{persona}__{resource_id}.json"


def load(persona: str | None, resource_id: str, data_version: int | None = None) -> dict | None:
    if not persona:
        return None
    p = path(persona, resource_id)
    if not p.exists():
        return None
    c = json.loads(p.read_text())
    if data_version is not None and c.get("data_version") != data_version:
        return None  # approved data changed since the run was cached
    return c


def save(persona: str, resource_id: str, data_version: int, mode: str, trace: list, packet: dict) -> None:
    CACHE_DIR.mkdir(exist_ok=True)
    path(persona, resource_id).write_text(json.dumps({
        "persona": persona, "resource_id": resource_id, "data_version": data_version, "mode": mode,
        "model": packet.get("draft", {}).get("drafted_by"),
        "cached_at": datetime.now(timezone.utc).isoformat(), "trace": trace, "packet": packet}, indent=1) + "\n")


def replay_enabled() -> bool:
    return os.environ.get("UNCLAIMED_DEMO_REPLAY", "").lower() in ("1", "true", "yes")


def cached_draft(c: dict | None) -> dict | None:
    """The AI draft from a cached run, without the rendered fields."""
    if not c or c.get("mode") != "ai":
        return None
    d = c["packet"]["draft"]
    return {k: d[k] for k in ("subject", "greeting", "sentences", "closing")}
