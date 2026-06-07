"""
LLM client — talks to any OpenAI-compatible endpoint (Ollama, LM Studio, etc.)
Returns the assistant message and basic usage statistics.
"""

import time
import httpx

from app.config import settings


class LLMResponse:
    def __init__(
        self,
        content: str,
        latency_ms: float,
        prompt_tokens: int,
        completion_tokens: int,
    ):
        self.content = content
        self.latency_ms = latency_ms
        self.prompt_tokens = prompt_tokens
        self.completion_tokens = completion_tokens


async def complete(
    model: str,
    system_prompt: str | None,
    user_prompt: str,
    temperature: float = 0.7,
    max_tokens: int = 512,
) -> LLMResponse:
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": user_prompt})

    payload = {
        "model": model,
        "messages": messages,
        "temperature": temperature,
        "max_tokens": max_tokens,
    }

    headers = {
        "Content-Type": "application/json",
        "Authorization": f"Bearer {settings.llm_api_key}",
    }

    start = time.perf_counter()
    async with httpx.AsyncClient(timeout=120.0) as client:
        resp = client.post(
            f"{settings.llm_base_url}/chat/completions",
            json=payload,
            headers=headers,
        )
        response = await resp
    elapsed_ms = (time.perf_counter() - start) * 1000

    response.raise_for_status()
    data = response.json()

    content = data["choices"][0]["message"]["content"]
    usage = data.get("usage", {})

    return LLMResponse(
        content=content,
        latency_ms=elapsed_ms,
        prompt_tokens=usage.get("prompt_tokens", 0),
        completion_tokens=usage.get("completion_tokens", 0),
    )


async def list_models() -> list[str]:
    """Return available model names from the configured endpoint."""
    headers = {"Authorization": f"Bearer {settings.llm_api_key}"}
    try:
        async with httpx.AsyncClient(timeout=10.0) as client:
            resp = await client.get(f"{settings.llm_base_url}/models", headers=headers)
        resp.raise_for_status()
        data = resp.json()
        return [m["id"] for m in data.get("data", [])]
    except Exception:
        # If the LLM server is unavailable, return an empty list rather than crashing.
        return []
