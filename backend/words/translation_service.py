"""Translation service with a two-layer cache.

Layer 1 — Django in-memory cache (:data:`django.core.cache.cache`):
    volatile, per-process, ``MEMORY_CACHE_TTL`` seconds. Flipped to Redis
    later by changing the ``CACHES`` backend in ``settings.py``.

Layer 2 — :class:`TranslationCache` rows in the database:
    permanent, shared across all users. The LLM is invoked **only** when
    both layers miss, making real translations fast and cheap.

Currently the LLM is :func:`_call_llm` is a deterministic mock; drop in a
real client (Claude / GPT / Gemini) by replacing its body — the return
contract is documented on the function itself.
"""
from __future__ import annotations

import logging
from typing import Any

from django.core.cache import cache as django_cache
from django.db.models import Sum

from .models import TranslationCache

logger = logging.getLogger(__name__)

# Layer-1 TTL. The DB layer never expires.
MEMORY_CACHE_TTL = 60 * 60 * 24  # 24h


# ---------------------------------------------------------------------------
# Public entry points
# ---------------------------------------------------------------------------

def translate_word(korean_text: str) -> dict[str, Any]:
    """Translate a single Korean word."""
    return _get_or_create(korean_text, entry_type=TranslationCache.TYPE_WORD)


def translate_phrase(korean_text: str) -> dict[str, Any]:
    """Translate a Korean phrase or full sentence."""
    return _get_or_create(korean_text, entry_type=TranslationCache.TYPE_PHRASE)


def translate_full_text(korean_text: str) -> dict[str, Any]:
    """Translate a full Korean passage (possibly multiple paragraphs)."""
    return _get_or_create(korean_text, entry_type=TranslationCache.TYPE_TEXT)


def get_cache_stats() -> dict[str, Any]:
    """Cheap monitoring view used by the admin and the stats endpoint."""
    qs = TranslationCache.objects.all()
    total = qs.count()
    total_served = qs.aggregate(s=Sum("usage_count"))["s"] or 0
    # One LLM call per unique row; every additional serve is free.
    llm_calls = total
    hit_rate = (
        round((total_served - llm_calls) / total_served * 100, 1)
        if total_served > 0
        else 0.0
    )
    return {
        "total_cached_entries": total,
        "total_requests_served": total_served,
        "llm_calls_made": llm_calls,
        "cache_hit_rate_percent": hit_rate,
        "words_cached": qs.filter(entry_type=TranslationCache.TYPE_WORD).count(),
        "phrases_cached": qs.filter(
            entry_type=TranslationCache.TYPE_PHRASE
        ).count(),
        "texts_cached": qs.filter(entry_type=TranslationCache.TYPE_TEXT).count(),
    }


# ---------------------------------------------------------------------------
# Internal
# ---------------------------------------------------------------------------

def _memory_key(normalized: str) -> str:
    # Cache keys in locmem must be <= 250 chars; 200 leaves headroom.
    return f"translation:{normalized[:200]}"


def _get_or_create(korean_text: str, entry_type: str) -> dict[str, Any]:
    normalized = TranslationCache.normalize(korean_text)
    mkey = _memory_key(normalized)

    # --- Layer 1: in-memory ------------------------------------------------
    cached = django_cache.get(mkey)
    if cached is not None:
        out = dict(cached)
        out["from_cache"] = True
        out["cache_layer"] = "memory"
        return out

    # --- Layer 2: database -------------------------------------------------
    try:
        entry = TranslationCache.objects.get(korean_normalized=normalized)
    except TranslationCache.DoesNotExist:
        entry = None

    if entry is not None:
        entry.usage_count += 1
        entry.save(update_fields=["usage_count", "updated_at"])
        result = _serialize(entry, from_cache=True, cache_layer="database")
        django_cache.set(mkey, result, MEMORY_CACHE_TTL)
        return result

    # --- Layer 3: LLM ------------------------------------------------------
    logger.info("Translation cache miss — calling LLM for: %s", korean_text[:60])
    try:
        llm = _call_llm(korean_text, entry_type)
    except Exception as exc:  # pragma: no cover — defensive
        logger.exception("LLM call failed")
        return _error_response(korean_text, str(exc))

    entry = TranslationCache.objects.create(
        korean_text=korean_text,
        korean_normalized=normalized,
        translation_en=llm.get("translation", ""),
        romanization=llm.get("romanization", ""),
        part_of_speech=llm.get("part_of_speech", ""),
        example_sentences=llm.get("example_sentences", []),
        formality_notes=llm.get("formality_notes", ""),
        grammar_notes=llm.get("grammar_notes", ""),
        entry_type=entry_type,
        llm_model_used=llm.get("_model", "mock"),
    )
    result = _serialize(entry, from_cache=False, cache_layer="none")
    django_cache.set(mkey, result, MEMORY_CACHE_TTL)
    return result


def _call_llm(korean_text: str, entry_type: str) -> dict[str, Any]:
    """Call the LLM and return a structured translation.

    MOCK IMPLEMENTATION — returns deterministic placeholder data so the
    rest of the stack (cache, API, frontend) can be wired up before any
    API keys exist. Replace the body of this function with a real call
    when you're ready.

    The returned dict **must** contain these keys (all strings unless
    otherwise noted):

    * ``translation``        — English translation
    * ``romanization``       — romanized Korean, or ""
    * ``part_of_speech``     — "noun" / "verb" / "phrase" / …
    * ``example_sentences``  — list of ``{"ko": str, "en": str}``
    * ``formality_notes``    — register / speech level, or ""
    * ``grammar_notes``      — learner-facing grammar note, or ""
    * ``_model``             — identifier of the model that produced this

    See ``README`` / the feature doc for ready-to-drop-in Claude and
    OpenAI implementations.
    """
    import time

    time.sleep(0.3)  # simulate network latency for a realistic spinner

    if entry_type == TranslationCache.TYPE_WORD:
        return {
            "translation": f"[Mock translation of '{korean_text}']",
            "romanization": _mock_romanization(korean_text),
            "part_of_speech": "noun",
            "example_sentences": [
                {
                    "ko": f"{korean_text}을(를) 공부하고 있어요.",
                    "en": f"I am studying {korean_text}.",
                }
            ],
            "formality_notes": "Neutral form. Can be used in most contexts.",
            "grammar_notes": (
                "This is a mock translation. "
                "Connect an LLM API to get real translations."
            ),
            "_model": "mock-v1",
        }

    if entry_type == TranslationCache.TYPE_PHRASE:
        return {
            "translation": f"[Mock phrase translation: '{korean_text}']",
            "romanization": _mock_romanization(korean_text),
            "part_of_speech": "phrase",
            "example_sentences": [],
            "formality_notes": "Context-dependent formality.",
            "grammar_notes": (
                "Mock translation. "
                "Connect an LLM API to get real translations."
            ),
            "_model": "mock-v1",
        }

    # Full text.
    return {
        "translation": (
            "[Mock full-text translation]\n\n"
            f"Original Korean text ({len(korean_text)} characters) "
            "would be translated here by the LLM.\n\n"
            "Connect an LLM API (Claude, GPT-4, Gemini) to enable real "
            "translation of full texts."
        ),
        "romanization": "",
        "part_of_speech": "text",
        "example_sentences": [],
        "formality_notes": "",
        "grammar_notes": "",
        "_model": "mock-v1",
    }


def _mock_romanization(_text: str) -> str:
    return "[romanization will appear here]"


def _serialize(
    entry: TranslationCache, *, from_cache: bool, cache_layer: str
) -> dict[str, Any]:
    return {
        "korean": entry.korean_text,
        "translation": entry.translation_en,
        "romanization": entry.romanization,
        "part_of_speech": entry.part_of_speech,
        "example_sentences": entry.example_sentences,
        "formality_notes": entry.formality_notes,
        "grammar_notes": entry.grammar_notes,
        "entry_type": entry.entry_type,
        "from_cache": from_cache,
        "cache_layer": cache_layer,
        "llm_model": entry.llm_model_used,
    }


def _error_response(korean_text: str, error: str) -> dict[str, Any]:
    return {
        "korean": korean_text,
        "translation": "",
        "romanization": "",
        "part_of_speech": "",
        "example_sentences": [],
        "formality_notes": "",
        "grammar_notes": "",
        "entry_type": "unknown",
        "from_cache": False,
        "cache_layer": "none",
        "llm_model": "error",
        "error": error,
    }
