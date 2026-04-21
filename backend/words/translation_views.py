"""HTTP endpoints for the AI translation service."""
from __future__ import annotations

from django.conf import settings
from django.core.cache import cache as django_cache
from rest_framework import status
from rest_framework.permissions import IsAuthenticated
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import TranslationCache
from .translation_service import (
    get_cache_stats,
    translate_full_text,
    translate_phrase,
    translate_word,
)


def _get_text(request, *, max_length: int, field: str = "text"):
    """Pull and validate the ``text`` field from an incoming payload.

    Returns ``(text, None)`` on success or ``(None, response)`` with a
    400 error Response ready to be returned by the caller.
    """
    text = (request.data.get(field) or "").strip()
    if not text:
        return None, Response(
            {"error": f"{field} field is required"},
            status=status.HTTP_400_BAD_REQUEST,
        )
    if len(text) > max_length:
        return None, Response(
            {
                "error": (
                    f"text too long ({len(text)} chars, max {max_length}); "
                    "use a longer-form endpoint"
                )
            },
            status=status.HTTP_400_BAD_REQUEST,
        )
    return text, None


class TranslateWordView(APIView):
    """``POST /api/translate/word/`` — translate a single Korean word."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        text, err = _get_text(
            request,
            max_length=getattr(
                settings, "TRANSLATION_MAX_WORD_LENGTH", 100
            ),
        )
        if err is not None:
            return err
        return Response(translate_word(text))


class TranslatePhraseView(APIView):
    """``POST /api/translate/phrase/`` — translate a phrase or sentence."""

    permission_classes = [IsAuthenticated]

    def post(self, request):
        text, err = _get_text(
            request,
            max_length=getattr(
                settings, "TRANSLATION_MAX_PHRASE_LENGTH", 500
            ),
        )
        if err is not None:
            return err
        return Response(translate_phrase(text))


class TranslateFullTextView(APIView):
    """``POST /api/translate/text/`` — translate a full Korean passage.

    This is the most expensive call — always hits the cache first.
    Accepts an optional ``text_id`` for logging / future usage analytics;
    it is not required and is not persisted on the cache row.
    """

    permission_classes = [IsAuthenticated]

    def post(self, request):
        text, err = _get_text(
            request,
            max_length=getattr(
                settings, "TRANSLATION_MAX_TEXT_LENGTH", 10_000
            ),
        )
        if err is not None:
            return err
        return Response(translate_full_text(text))


class TranslateCacheStatsView(APIView):
    """``GET /api/translate/stats/`` — cache statistics for monitoring."""

    permission_classes = [IsAuthenticated]

    def get(self, request):
        return Response(get_cache_stats())


class TranslateCacheInvalidateView(APIView):
    """``DELETE /api/translate/cache/`` — staff-only single-entry invalidation.

    Body: ``{"text": "한국어"}``.  Used to correct bad translations without
    needing the admin — handy when debugging prompt regressions.
    """

    permission_classes = [IsAuthenticated]

    def delete(self, request):
        if not request.user.is_staff:
            return Response(status=status.HTTP_403_FORBIDDEN)

        text = (request.data.get("text") or "").strip()
        if not text:
            return Response(
                {"error": "text required"},
                status=status.HTTP_400_BAD_REQUEST,
            )

        normalized = TranslationCache.normalize(text)
        deleted, _ = TranslationCache.objects.filter(
            korean_normalized=normalized
        ).delete()
        django_cache.delete(f"translation:{normalized[:200]}")
        return Response({"deleted": deleted > 0})
