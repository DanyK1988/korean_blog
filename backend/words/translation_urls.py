"""URL routes mounted at ``/api/translate/``."""
from django.urls import path

from .translation_views import (
    TranslateCacheInvalidateView,
    TranslateCacheStatsView,
    TranslateFullTextView,
    TranslatePhraseView,
    TranslateWordView,
)

urlpatterns = [
    path("word/", TranslateWordView.as_view(), name="translate-word"),
    path("phrase/", TranslatePhraseView.as_view(), name="translate-phrase"),
    path("text/", TranslateFullTextView.as_view(), name="translate-text"),
    path("stats/", TranslateCacheStatsView.as_view(), name="translate-stats"),
    path(
        "cache/",
        TranslateCacheInvalidateView.as_view(),
        name="translate-cache",
    ),
]
