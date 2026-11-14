"""Thin wrapper around the Anthropic SDK.

get_llm() returns None when no credentials are configured, so every caller must have a
labelled no-LLM path. Tests replace get_llm with a fake.
"""

import json
import os

import anthropic

MODEL = os.environ.get("UNCLAIMED_MODEL", "claude-opus-5-5")
# On a safety decline the API re-runs the request on Anthropic's recommended fallback model.
FALLBACK = {"betas": ["server-side-fallback-2026-07-01"], "fallbacks": "default"}


class LLMError(RuntimeError):
    pass


class LLM:
    def __init__(self, client: anthropic.Anthropic, model: str = MODEL):
        self.client = client
        self.model = model

    def _create(self, **kwargs):
        try:
            response = self.client.beta.messages.create(model=self.model, **FALLBACK, **kwargs)
        except anthropic.APIConnectionError as e:
            raise LLMError(f"could not reach the Claude API: {e}") from e
        except anthropic.APIStatusError as e:
            raise LLMError(f"Claude API error {e.status_code}: {e.message}") from e
        if response.stop_reason == "refusal":
            raise LLMError("the model declined this request")
        if response.stop_reason == "max_tokens":
            raise LLMError("the model ran out of room before finishing")
        return response

    def json(self, system: str, user: str, schema: dict, effort: str = "medium") -> dict:
        """One structured-output call. The schema guarantees valid JSON in the first text block."""
        response = self._create(
            max_tokens=16000, system=system, messages=[{"role": "user", "content": user}],
            output_config={"effort": effort, "format": {"type": "json_schema", "schema": schema}},
        )
        text = next((b.text for b in response.content if b.type == "text"), None)
        if text is None:
            raise LLMError("no JSON in the response")
        return json.loads(text)

    def chat(self, system: str, messages: list, tools: list, effort: str = "low"):
        """One turn of a tool-use loop. Returns the SDK message."""
        return self._create(max_tokens=16000, system=system, messages=messages, tools=tools,
                            output_config={"effort": effort})


def has_credentials() -> bool:
    if os.environ.get("UNCLAIMED_LLM", "").lower() == "off":
        return False
    return bool(os.environ.get("ANTHROPIC_API_KEY") or os.environ.get("ANTHROPIC_AUTH_TOKEN"))


def get_llm() -> LLM | None:
    if not has_credentials():
        return None
    return LLM(anthropic.Anthropic())
