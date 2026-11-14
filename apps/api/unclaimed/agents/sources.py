"""fetch_source: re-read an approved record's source page and compare it to what was approved.

Only allowlisted URLs are fetched. The live text is never trusted over the approved record:
a mismatch is logged in source_checks for the owner to review, and the approved version stays.
"""

import re
from html.parser import HTMLParser

import httpx
from sqlalchemy.orm import Session

from unclaimed.allowlist import is_allowed
from unclaimed.models import SourceCheck

USER_AGENT = "UnclaimedBot/0.1 (student hackathon project; re-checks public pages)"
MIN_READABLE = 400  # characters; less than this is usually a JavaScript-only page


class _Text(HTMLParser):
    SKIP = {"script", "style", "noscript", "svg", "template"}

    def __init__(self):
        super().__init__()
        self.parts: list[str] = []
        self.depth = 0

    def handle_starttag(self, tag, attrs):
        if tag in self.SKIP:
            self.depth += 1

    def handle_endtag(self, tag):
        if tag in self.SKIP and self.depth:
            self.depth -= 1

    def handle_data(self, data):
        if not self.depth:
            self.parts.append(data)


def html_to_text(html: str) -> str:
    """Visible page text, whitespace collapsed, original case kept (the extractor quotes from it)."""
    p = _Text()
    p.feed(html)
    return re.sub(r"\s+", " ", " ".join(p.parts)).strip()


def normalize(text: str) -> str:
    text = text.replace("’", "'").replace("‘", "'").replace("“", '"').replace("”", '"')
    text = text.replace("–", "-").replace("—", "-").replace("\xa0", " ")
    return re.sub(r"\s+", " ", text).strip().lower()


def http_fetch(url: str) -> tuple[int, str]:
    with httpx.Client(timeout=10, follow_redirects=True, headers={"User-Agent": USER_AGENT}) as client:
        r = client.get(url)
        # Never follow a redirect off the allowlist.
        if not is_allowed(str(r.url)):
            raise ValueError(f"redirected off the allowlist to {r.url}")
        return r.status_code, r.text


def compare(resource: dict, code: int | None, text: str | None, error: str | None = None) -> tuple[str, str]:
    """Compare fetched page text with the approved record. Shared by the Claim Agent and the Watcher."""
    if error:
        return "unreachable", f"could not fetch the page: {error}"
    if code is None or code >= 400:
        return "unreachable", f"the page returned HTTP {code}"
    page = normalize(text or "")
    if normalize(resource["evidence_quote"]) in page:
        return "verified", "the approved evidence quote is still on the page"
    if len(page) < MIN_READABLE:
        return "unreadable", "the page loads its text with JavaScript, so it could not be re-read automatically"
    return "changed", "the approved evidence quote is no longer on the page; flagged for owner review"


def check_source(session: Session, resource: dict, fetch=http_fetch) -> dict:
    """Return {status, detail, url}. status: verified | changed | unreadable | unreachable | blocked."""
    url = resource["source_url"]
    if not is_allowed(url):
        status, detail = "blocked", "source URL is not on the allowlist, so it was not fetched"
    else:
        try:
            code, html = fetch(url)
        except Exception as e:  # network errors, timeouts, off-allowlist redirects
            status, detail = compare(resource, None, None, str(e))
        else:
            status, detail = compare(resource, code, html_to_text(html) if code < 400 else "")
    session.add(SourceCheck(resource_id=resource["id"], data_version=resource["data_version"], url=url,
                            status=status, detail=detail))
    session.commit()
    return {"status": status, "detail": detail, "url": url}
