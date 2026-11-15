"""Choosing the AI provider, and the Gemini wrapper (with a fake client: no network)."""

from types import SimpleNamespace

import pytest

from unclaimed.agents import llm


@pytest.fixture
def env(monkeypatch):
    for k in ("GEMINI_API_KEY", "GOOGLE_API_KEY", "ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN",
              "UNCLAIMED_LLM", "UNCLAIMED_LLM_PROVIDER", "UNCLAIMED_MODEL", "GEMINI_MODEL", "ANTHROPIC_MODEL"):
        monkeypatch.delenv(k, raising=False)
    return monkeypatch


def test_no_key_means_no_ai(env):
    assert llm.provider() is None and llm.get_llm() is None and not llm.has_credentials()
    assert "no API key" in llm.status()["problem"]


def test_a_key_without_a_model_keeps_ai_off_and_says_why(env):
    env.setenv("GEMINI_API_KEY", "g")
    assert llm.provider() is None and llm.status()["problem"] == "GEMINI_MODEL is not set"


def test_gemini_needs_its_key_and_model_from_the_environment(env):
    env.setenv("GEMINI_API_KEY", "g")
    env.setenv("GEMINI_MODEL", "some-gemini-model")
    assert llm.provider() == "gemini" and llm.model_for("gemini") == "some-gemini-model"


def test_anthropic_needs_its_key_and_model(env):
    env.setenv("ANTHROPIC_API_KEY", "a")
    assert llm.provider() is None and llm.status()["problem"] == "ANTHROPIC_MODEL is not set"
    env.setenv("ANTHROPIC_MODEL", "some-claude-model")
    assert llm.provider() == "anthropic"


def test_both_configured_prefer_gemini_unless_told_otherwise(env):
    env.setenv("GEMINI_API_KEY", "g")
    env.setenv("GEMINI_MODEL", "gm")
    env.setenv("ANTHROPIC_API_KEY", "a")
    env.setenv("ANTHROPIC_MODEL", "am")
    assert llm.provider() == "gemini"
    env.setenv("UNCLAIMED_LLM_PROVIDER", "anthropic")
    assert llm.provider() == "anthropic"


def test_unclaimed_model_overrides(env):
    env.setenv("GEMINI_API_KEY", "g")
    env.setenv("GEMINI_MODEL", "gm")
    env.setenv("UNCLAIMED_MODEL", "other")
    assert llm.model_for("gemini") == "other"


def test_off_switch_wins(env):
    env.setenv("GEMINI_API_KEY", "g")
    env.setenv("GEMINI_MODEL", "gm")
    env.setenv("UNCLAIMED_LLM", "off")
    assert llm.provider() is None


def _gemini(response=None, raises=None):
    g = llm.GeminiLLM.__new__(llm.GeminiLLM)
    from google.genai import errors, types
    g.errors, g.types, g.model, g.thinking_level = errors, types, "some-gemini-model", None

    def generate_content(model, contents, config):
        assert config.response_mime_type == "application/json" and config.response_json_schema == {"type": "object"}
        if raises:
            raise raises
        return response
    g.client = SimpleNamespace(models=SimpleNamespace(generate_content=generate_content))
    return g


def test_gemini_returns_parsed_json():
    r = SimpleNamespace(text='{"ok": true}', candidates=[SimpleNamespace(finish_reason="STOP")])
    assert _gemini(r).json("sys", "user", {"type": "object"}) == {"ok": True}


@pytest.mark.parametrize("reason, text", [("SAFETY", ""), ("MAX_TOKENS", "{"), ("STOP", ""), ("STOP", "not json")])
def test_gemini_problems_become_llm_errors(reason, text):
    r = SimpleNamespace(text=text, candidates=[SimpleNamespace(finish_reason=reason)])
    with pytest.raises(llm.LLMError):
        _gemini(r).json("sys", "user", {"type": "object"})


def test_gemini_network_failure_becomes_llm_error():
    with pytest.raises(llm.LLMError, match="could not reach"):
        _gemini(raises=OSError("offline")).json("sys", "user", {"type": "object"})


def test_timeout_comes_from_the_environment(env):
    assert llm.timeout_seconds() == 30.0
    env.setenv("UNCLAIMED_AI_TIMEOUT", "8")
    assert llm.timeout_seconds() == 8.0


def test_gemini_timeout_becomes_a_clear_llm_error(env):
    import httpx
    with pytest.raises(llm.LLMError, match="longer than 30 seconds"):
        _gemini(raises=httpx.ReadTimeout("timed out")).json("sys", "user", {"type": "object"})
