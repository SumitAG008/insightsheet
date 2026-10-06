"""The AI service on Claude: model choice, effort, fallbacks, JSON replies, refusals and errors.

Uses a fake client, so no request reaches Anthropic and nothing is billed.
"""
import asyncio
from types import SimpleNamespace

import anthropic
import httpx2 as httpx
import pytest

from app.services import ai_service


class FakeMessages:
    def __init__(self, reply):
        self.reply = reply
        self.calls = []

    async def create(self, **kwargs):
        self.calls.append(kwargs)
        if isinstance(self.reply, Exception):
            raise self.reply
        return self.reply


def _reply(text, stop_reason="end_turn", model="claude-opus-5-5"):
    return SimpleNamespace(
        content=[SimpleNamespace(type="thinking", thinking=""), SimpleNamespace(type="text", text=text)],
        stop_reason=stop_reason,
        usage=SimpleNamespace(input_tokens=120, output_tokens=30),
        model=model,
    )


@pytest.fixture
def fake(monkeypatch):
    def install(reply):
        messages = FakeMessages(reply)
        beta_messages = FakeMessages(reply)
        client = SimpleNamespace(messages=messages, beta=SimpleNamespace(messages=beta_messages))
        monkeypatch.setattr(ai_service, "_get_client", lambda: client)
        return messages, beta_messages
    monkeypatch.delenv("AI_ASSISTANT_MODEL", raising=False)
    monkeypatch.delenv("AI_ASSISTANT_EFFORT", raising=False)
    monkeypatch.delenv("AI_ASSISTANT_MAX_TOKENS", raising=False)
    return install


def test_defaults_to_claude_opus_with_fallbacks_and_ignores_openai_model_names(fake):
    _, beta = fake(_reply("Sales rose 12% in March."))
    out = asyncio.run(ai_service.invoke_llm("What changed?", model="gpt-4o-mini", max_tokens=300, return_usage=True))
    call = beta.calls[0]
    assert call["model"] == "claude-opus-5-5"
    assert call["fallbacks"] == "default" and call["betas"] == ["server-side-fallback-2026-07-01"]
    assert call["output_config"] == {"effort": "medium"}
    assert call["max_tokens"] >= 16000  # room for thinking; a 300-token cap would cut the answer off
    assert "thinking" not in call and "temperature" not in call
    assert out["content"] == "Sales rose 12% in March."
    assert out["usage"] == {"prompt_tokens": 120, "completion_tokens": 30, "total_tokens": 150}


def test_configured_model_and_effort_are_used(fake, monkeypatch):
    monkeypatch.setenv("AI_ASSISTANT_MODEL", "claude-haiku-4-5")
    monkeypatch.setenv("AI_ASSISTANT_EFFORT", "high")
    messages, beta = fake(_reply("ok"))
    asyncio.run(ai_service.invoke_llm("hi"))
    # Haiku takes neither effort nor server-side fallbacks, so it goes through plain messages.
    assert not beta.calls and messages.calls[0]["model"] == "claude-haiku-4-5"
    assert "output_config" not in messages.calls[0] and "fallbacks" not in messages.calls[0]
    monkeypatch.setenv("AI_ASSISTANT_MODEL", "gpt-4o")  # not a Claude model: ignored
    assert ai_service.assistant_model() == "claude-opus-5-5"


def test_json_replies_are_parsed_even_with_fences(fake):
    _, beta = fake(_reply('```json\n{"formula": "=SUM(A1:A10)"}\n```'))
    out = asyncio.run(ai_service.invoke_llm("formula please", response_schema={"type": "json_object"}))
    assert out == {"formula": "=SUM(A1:A10)"}
    assert "single JSON object" in beta.calls[0]["system"]

    fake(_reply('Here it is: {"a": 1} hope that helps'))
    assert asyncio.run(ai_service.invoke_llm("x", response_schema={"type": "json_object"})) == {"a": 1}


def test_refusals_and_api_errors_give_safe_messages(fake):
    fake(_reply("", stop_reason="refusal"))
    with pytest.raises(ai_service.AIServiceError) as e:
        asyncio.run(ai_service.invoke_llm("x"))
    assert ai_service.explain_ai_error(e.value) == "the AI declined this request"

    request = httpx.Request("POST", "https://api.anthropic.com/v1/messages")
    err = anthropic.AuthenticationError("bad key", response=httpx.Response(401, request=request), body=None)
    fake(err)
    with pytest.raises(ai_service.AIServiceError) as e:
        asyncio.run(ai_service.invoke_llm("x"))
    assert ai_service.explain_ai_error(e.value) == "the Anthropic API key on the server is missing or invalid"


def test_image_generation_is_reported_unavailable():
    with pytest.raises(ai_service.AIServiceError):
        asyncio.run(ai_service.generate_image("a cat"))


def test_ai_status_reports_a_missing_key_in_plain_words(monkeypatch):
    import os as _os
    import pytest as _pytest
    main = _pytest.importorskip("app.main")
    from fastapi.testclient import TestClient

    monkeypatch.delenv("ANTHROPIC_API_KEY", raising=False)
    main.app.dependency_overrides[main.get_current_user] = lambda: {"email": "x@y.z", "role": "user"}
    try:
        out = TestClient(main.app).get("/api/ai/status?fresh=true").json()
    finally:
        main.app.dependency_overrides.clear()
    assert out["configured"] is False and out["ok"] is False
    assert "ANTHROPIC_API_KEY" in out["reason"] and "Railway" in out["reason"]
