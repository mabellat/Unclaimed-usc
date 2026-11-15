"""The one door to a language model. Configured only by environment variables (or <repo>/.env):

  GEMINI_API_KEY (or GOOGLE_API_KEY) + GEMINI_MODEL       -> Google Gemini
  ANTHROPIC_API_KEY + ANTHROPIC_MODEL                     -> Anthropic Claude

There is no model name in the code: without a model the AI stays off, and status() says what is
missing. UNCLAIMED_AI_TIMEOUT (seconds, default 30) bounds every call: a slow call gives up and the
agent falls back to its template. GEMINI_THINKING_LEVEL (e.g. low) limits Gemini's thinking time. UNCLAIMED_LLM_PROVIDER=gemini|anthropic picks one when both are configured; UNCLAIMED_LLM=off
turns AI off. Every agent only calls `json()`: one structured output per call, then our own code
checks it. get_llm() returns None when AI is off, so every caller keeps its labelled no-AI path.
Tests replace get_llm with a fake.
"""

import json
import os

PROVIDERS = {
    "gemini": {"name": "Gemini", "key_env": ("GEMINI_API_KEY", "GOOGLE_API_KEY"), "model_env": "GEMINI_MODEL"},
    "anthropic": {"name": "Claude", "key_env": ("ANTHROPIC_API_KEY", "ANTHROPIC_AUTH_TOKEN"), "model_env": "ANTHROPIC_MODEL"},
}
# On a safety decline Anthropic re-runs the request on its recommended fallback model.
ANTHROPIC_FALLBACK = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}


class LLMError(RuntimeError):
    pass


class LLM:
    provider = ""
    model = ""

    @property
    def name(self) -> str:
        return PROVIDERS[self.provider]["name"]

    def json(self, system: str, user: str, schema: dict, effort: str = "medium") -> dict:
        raise NotImplementedError


def timeout_seconds() -> float:
    try:
        return max(1.0, float(os.environ.get("UNCLAIMED_AI_TIMEOUT", "30")))
    except ValueError:
        return 30.0


class AnthropicLLM(LLM):
    provider = "anthropic"

    def __init__(self, model: str):
        import anthropic

        self.anthropic, self.model = anthropic, model
        self.client = anthropic.Anthropic(timeout=timeout_seconds(), max_retries=0)

    def json(self, system: str, user: str, schema: dict, effort: str = "medium") -> dict:
        a = self.anthropic
        try:
            response = self.client.beta.messages.create(
                model=self.model, max_tokens=16000, system=system, messages=[{"role": "user", "content": user}],
                output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}}, **ANTHROPIC_FALLBACK)
        except a.APIConnectionError as e:
            raise LLMError(f"could not reach the Claude API: {e}") from e
        except a.APIStatusError as e:
            raise LLMError(f"Claude API error {e.status_code}: {e.message}") from e
        if response.stop_reason == "refusal":
            raise LLMError("the model declined this request")
        if response.stop_reason == "max_tokens":
            raise LLMError("the model ran out of room before finishing")
        text = next((b.text for b in response.content if b.type == "text"), None)
        if text is None:
            raise LLMError("no JSON in the response")
        return json.loads(text)


class GeminiLLM(LLM):
    provider = "gemini"

    def __init__(self, model: str, api_key: str):
        from google import genai
        from google.genai import errors, types

        self.errors, self.types, self.model = errors, types, model
        self.client = genai.Client(api_key=api_key, http_options=types.HttpOptions(timeout=int(timeout_seconds() * 1000)))
        self.thinking_level = os.environ.get("GEMINI_THINKING_LEVEL") or None

    def json(self, system: str, user: str, schema: dict, effort: str = "medium") -> dict:
        thinking = self.types.ThinkingConfig(thinking_level=self.thinking_level) if self.thinking_level else None
        config = self.types.GenerateContentConfig(
            system_instruction=system, response_mime_type="application/json", response_json_schema=schema,
            thinking_config=thinking)
        try:
            response = self.client.models.generate_content(model=self.model, contents=user, config=config)
        except self.errors.APIError as e:
            raise LLMError(f"Gemini API error {getattr(e, 'code', '')}: {getattr(e, 'message', e)}") from e
        except Exception as e:  # network failures and timeouts surface as httpx or OS errors
            if "timeout" in type(e).__name__.lower() or "timed out" in str(e).lower():
                raise LLMError(f"Gemini took longer than {timeout_seconds():.0f} seconds (UNCLAIMED_AI_TIMEOUT)") from e
            raise LLMError(f"could not reach the Gemini API: {e}") from e
        candidate = (response.candidates or [None])[0]
        reason = str(getattr(candidate, "finish_reason", "") or "")
        if "SAFETY" in reason or "BLOCK" in reason or "PROHIBITED" in reason:
            raise LLMError("the model declined this request")
        if "MAX_TOKENS" in reason:
            raise LLMError("the model ran out of room before finishing")
        if not response.text:
            raise LLMError("no JSON in the response")
        try:
            return json.loads(response.text)
        except json.JSONDecodeError as e:
            raise LLMError("the response was not valid JSON") from e


def _key(p: str) -> str | None:
    return next((os.environ[k] for k in PROVIDERS[p]["key_env"] if os.environ.get(k)), None)


def model_for(p: str | None) -> str | None:
    """The model from the environment only. UNCLAIMED_MODEL overrides the provider's own variable."""
    if p is None:
        return None
    return os.environ.get("UNCLAIMED_MODEL") or os.environ.get(PROVIDERS[p]["model_env"]) or None


def status() -> dict:
    """What is configured, and if AI is off, why (shown on /agents/status)."""
    if os.environ.get("UNCLAIMED_LLM", "").lower() == "off":
        return {"provider": None, "model": None, "problem": "UNCLAIMED_LLM=off"}
    chosen = os.environ.get("UNCLAIMED_LLM_PROVIDER", "").lower()
    candidates = [chosen] if chosen in PROVIDERS else [p for p in ("gemini", "anthropic") if _key(p)]
    if not candidates:
        return {"provider": None, "model": None, "problem": "no API key set (GEMINI_API_KEY or ANTHROPIC_API_KEY)"}
    p = candidates[0]
    if not _key(p):
        return {"provider": None, "model": None, "problem": f"{PROVIDERS[p]['key_env'][0]} is not set"}
    model = model_for(p)
    if not model:
        return {"provider": None, "model": None, "problem": f"{PROVIDERS[p]['model_env']} is not set"}
    return {"provider": p, "model": model, "problem": None}


def provider() -> str | None:
    return status()["provider"]


def has_credentials() -> bool:
    return provider() is not None


def get_llm() -> LLM | None:
    st = status()
    if st["provider"] == "gemini":
        return GeminiLLM(st["model"], _key("gemini"))
    if st["provider"] == "anthropic":
        return AnthropicLLM(st["model"])
    return None
