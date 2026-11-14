"""Evidence catalog, the groundedness check, and the no-LLM template draft.

Every sentence of a draft cites refs from the catalog. The check is deterministic:
  - cited refs must exist,
  - every number, amount or date in a sentence must appear in the text it cites,
  - an evidence citation must share wording with the cited text,
  - only a plain question may go uncited, and only if it states no numbers,
  - no sentence may claim eligibility or approval (the office decides that).
"""

import re

from unclaimed.rules import load_fields

STOP = set("""a an and are as at be been by for from has have i in is it its me my of on or our so that the their this to
was we were will with you your can could would should please about into also than then there these those which who what
when where while being does did do not no yes any all more most some such only other""".split())
CLAIMS = re.compile(
    r"\b(i\s*(am|'m)\s+(eligible|qualified)|i\s+qualify|i\s+meet\s+(all|every|the)\s+(requirement|criteria|eligibility)"
    r"|guarantee|already\s+(been\s+)?approved|i\s+(have\s+been|was)\s+approved|entitled\s+to)", re.I)
NUMBER = re.compile(r"\$?\d[\d,]*(?:\.\d+)?")


def _answer_label(spec: dict, value) -> str:
    labels = spec.get("labels") or {}
    if isinstance(value, bool):
        return "Yes" if value else "No"
    if isinstance(value, list):
        return ", ".join(labels.get(v, v) for v in value) or "None of these"
    return labels.get(value, value)


def statements_for(field: str, value) -> list[str]:
    """The approved sentences for this answer (profile_fields.json `statements`)."""
    st = load_fields()[field].get("statements", {})
    if isinstance(value, bool):
        s = st.get("true" if value else "false")
        return [s] if s else []
    if isinstance(value, list):
        return [st[v] for v in value if v in st]
    return [st[value]] if value in st else []


def build_catalog(resource: dict, facts: dict, why_fields: list[str]) -> dict[str, str]:
    """ref -> text. Profile refs cover only fields that this resource's passing rules use."""
    cat: dict[str, str] = {"title": resource["title"], "quote": resource["evidence_quote"]}
    if resource.get("provider"):
        cat["provider"] = resource["provider"]
    if resource.get("benefit") and resource["benefit"].get("label"):
        cat["benefit"] = resource["benefit"]["label"]
    if resource.get("deadline"):
        cat["deadline"] = resource["deadline"]["label"]
    if resource.get("where"):
        cat["where"] = resource["where"]
    for i, s in enumerate(resource.get("steps") or []):
        cat[f"step:{i + 1}"] = s["text"]
    for i, d in enumerate(resource.get("docs") or []):
        cat[f"doc:{i + 1}"] = d["text"]
    for i, line in enumerate((resource.get("note") or "").splitlines()):
        if line.strip():
            cat[f"note:{i + 1}"] = line.strip()
    fields = load_fields()
    for f in why_fields:
        if f in facts and f in fields:
            sentences = statements_for(f, facts[f])
            cat[f"profile:{f}"] = " ".join(
                [fields[f]["question"], "Answer:", _answer_label(fields[f], facts[f]) + ".", *sentences])
    return cat


def _numbers(text: str) -> set[str]:
    return {n.replace("$", "").replace(",", "").rstrip(".") for n in NUMBER.findall(text)}


def _words(text: str) -> set[str]:
    return {w for w in re.findall(r"[a-z][a-z'\-]{3,}", text.lower()) if w not in STOP}


def check(draft: dict, catalog: dict[str, str]) -> dict:
    """Return {"passed": bool, "issues": [...], "checked": n}."""
    issues = []
    for part in ("greeting", "closing"):
        t = draft.get(part, "")
        if NUMBER.search(t) or len(t) > 80:
            issues.append({"where": part, "problem": f"the {part} must be short and state no facts"})
    subject_nums = _numbers(draft.get("subject", "")) - _numbers(catalog.get("title", "") + " " + catalog.get("benefit", ""))
    if subject_nums:
        issues.append({"where": "subject", "problem": f"the subject states {', '.join(sorted(subject_nums))}, which is not in the title or benefit"})
    sentences = draft.get("sentences", [])
    if not sentences:
        issues.append({"where": "body", "problem": "the draft has no sentences"})
    for i, s in enumerate(sentences):
        text, cites = s.get("text", ""), s.get("cites", [])
        where = f"sentence {i + 1}"
        if CLAIMS.search(text):
            issues.append({"where": where, "problem": "claims eligibility or approval; only the office decides that"})
        unknown = [c for c in cites if c not in catalog]
        if unknown:
            issues.append({"where": where, "problem": f"cites refs that do not exist: {', '.join(unknown)}"})
        cited = " ".join(catalog[c] for c in cites if c in catalog)
        if not cites:
            if not text.rstrip().endswith("?") or NUMBER.search(text):
                issues.append({"where": where, "problem": "states something without citing the source page or the student's card"})
            continue
        missing = _numbers(text) - _numbers(cited)
        if missing:
            issues.append({"where": where, "problem": f"states {', '.join(sorted(missing))}, which the cited text does not contain"})
        if not (_words(text) & _words(cited)):
            issues.append({"where": where, "problem": "shares no wording with what it cites"})
    return {"passed": not issues, "issues": issues, "checked": len(sentences)}


def template_draft(resource: dict, catalog: dict[str, str], facts: dict, why_fields: list[str]) -> dict:
    """A deterministic draft built only from catalog text. Grounded by construction."""
    title = resource["title"]
    sentences = [{"text": f"I'm writing about the {title}" + (f" from {resource['provider']}." if resource.get("provider") else "."),
                  "cites": ["title"] + (["provider"] if resource.get("provider") else [])}]
    for f in why_fields:
        ref = f"profile:{f}"
        if ref in catalog:
            for st in statements_for(f, facts[f]):
                sentences.append({"text": st, "cites": [ref]})
    if "deadline" in catalog:
        sentences.append({"text": f"I saw this on your page about timing: {catalog['deadline'].rstrip('.')}.", "cites": ["deadline"]})
    sentences.append({"text": "Could you confirm what I need to submit and whether you need anything else from me?", "cites": []})
    return {"subject": f"Question about the {title}", "greeting": "Hello,", "sentences": sentences,
            "closing": "Thank you for your time."}


def render(draft: dict) -> str:
    body = " ".join(s["text"] for s in draft["sentences"])
    return f"{draft['greeting']}\n\n{body}\n\n{draft['closing']}"
