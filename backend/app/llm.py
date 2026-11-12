"""Date-night ideas via an OpenAI-compatible chat API. Never log prompt or reply text."""

from __future__ import annotations

import logging
from typing import Protocol

import httpx

from app.config import Settings, get_settings

logger = logging.getLogger("closer.llm")

SYSTEM_PROMPT = (
    "Suggest one warm, practical in-person date-night idea for a long-distance couple "
    "who will meet soon. Reply with a single short paragraph. No preamble or title."
)


class LlmClient(Protocol):
    def suggest_date_night(self, vibe: str | None) -> str: ...


class OpenAiCompatibleClient:
    def __init__(self, settings: Settings | None = None) -> None:
        self._settings = settings or get_settings()

    def suggest_date_night(self, vibe: str | None) -> str:
        key = self._settings.llm_api_key.strip()
        if not key:
            raise LlmNotConfiguredError()
        user_content = "Suggest a date-night idea."
        if vibe:
            user_content = f"Suggest a date-night idea. Mood: {vibe}"
        # Log only that a call happened — never prompt or reply text.
        logger.info("date_night_idea_request")
        with httpx.Client(timeout=30.0) as client:
            response = client.post(
                f"{self._settings.llm_base_url.rstrip('/')}/chat/completions",
                headers={"Authorization": f"Bearer {key}"},
                json={
                    "model": self._settings.llm_model,
                    "messages": [
                        {"role": "system", "content": SYSTEM_PROMPT},
                        {"role": "user", "content": user_content},
                    ],
                    "temperature": 0.9,
                    "max_tokens": 250,
                },
            )
        if response.status_code >= 400:
            logger.warning("date_night_idea_provider_error status=%s", response.status_code)
            raise LlmProviderError()
        payload = response.json()
        try:
            text = str(payload["choices"][0]["message"]["content"]).strip()
        except (KeyError, IndexError, TypeError) as exc:
            logger.warning("date_night_idea_bad_payload")
            raise LlmProviderError() from exc
        if not text:
            raise LlmProviderError()
        logger.info("date_night_idea_response")
        return text[:1000]


class LlmNotConfiguredError(Exception):
    pass


class LlmProviderError(Exception):
    pass


def get_llm_client() -> LlmClient:
    return OpenAiCompatibleClient()
