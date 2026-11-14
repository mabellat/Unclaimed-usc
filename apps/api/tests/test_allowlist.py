import pytest

from unclaimed.allowlist import is_allowed, load_sources


@pytest.mark.parametrize("url", [
    "https://usc.edu/",
    "https://engage.usc.edu/Gsg/gsg-ta/",
    "https://dornsife.usc.edu/css/surf/",
    "https://uscimmigrationclinic.org/",
    "https://www.uscimmigrationclinic.org/about",
])
def test_allowed(url):
    assert is_allowed(url)


@pytest.mark.parametrize("url", [
    "https://sc.edu/",
    "https://www.uscupstate.edu/",
    "https://usc.edu.evil.com/",
    "https://evilusc.edu/",
    "https://notusc.edu/",
    "https://docs.google.com/forms/d/e/x/viewform",
    "https://www.getcalfresh.org",
    "https://calendly.com/usc-ilac",
    "https://clinic.uscimmigrationclinic.org.evil.com/",
    "https://usc.edu@evil.com/",
    "ftp://usc.edu/file",
    "not a url",
])
def test_rejected(url):
    assert not is_allowed(url)


def test_exactly_one_exception_and_it_is_owner_approved():
    exceptions = load_sources()["exceptions"]
    assert [e["domain"] for e in exceptions] == ["uscimmigrationclinic.org"]
    assert exceptions[0]["note"] == "owner-approved exception"


def test_every_listed_source_is_allowed():
    sources = load_sources()["sources"]
    assert sources
    assert all(is_allowed(s["url"]) for s in sources)
