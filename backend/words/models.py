"""Personal dictionary models.

A ``Word`` is the shared record for a Korean *entry* — it may represent a
single vocabulary item ("책") or a full phrase/sentence ("한국어를 배우고
있어요"). Per-user state (how many times it was reviewed, personal notes,
etc.) lives on the ``UserWord`` through table.

``TranslationCache`` is an independent, user-agnostic cache of
LLM-generated translations so we only pay the API cost for each unique
Korean input once.
"""
import re

from django.conf import settings
from django.db import models
from django.utils import timezone


class Word(models.Model):
    """A Korean entry — word *or* phrase — shared across users."""

    SOURCE_POST = "post"
    SOURCE_TEXT = "text"
    SOURCE_MANUAL = "manual"
    SOURCE_TYPE_CHOICES = [
        (SOURCE_POST, "Post"),
        (SOURCE_TEXT, "Text"),
        (SOURCE_MANUAL, "Manual"),
    ]

    korean_word = models.CharField(max_length=500)
    translation = models.CharField(max_length=1000)
    romanization = models.CharField(max_length=500, blank=True)
    example_sentence = models.TextField(blank=True)

    is_phrase = models.BooleanField(default=False)
    context_sentence = models.CharField(max_length=1000, blank=True)

    source_type = models.CharField(
        max_length=10,
        choices=SOURCE_TYPE_CHOICES,
        default=SOURCE_MANUAL,
    )
    source_post = models.ForeignKey(
        "posts.Post",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="saved_words",
    )
    source_text = models.ForeignKey(
        "texts.Text",
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="saved_words",
    )

    users = models.ManyToManyField(
        settings.AUTH_USER_MODEL,
        through="UserWord",
        related_name="saved_words",
    )

    class Meta:
        ordering = ["korean_word"]

    def __str__(self) -> str:
        label = "phrase" if self.is_phrase else "word"
        return f"[{label}] {self.korean_word} — {self.translation}"


class UserWord(models.Model):
    """Through table for the ``User`` ↔ ``Word`` M2M relationship.

    Also stores the per-user SRS (SM-2) scheduling state used by the
    flashcard Study page.
    """

    user = models.ForeignKey(settings.AUTH_USER_MODEL, on_delete=models.CASCADE)
    word = models.ForeignKey(Word, on_delete=models.CASCADE)
    added_at = models.DateTimeField(auto_now_add=True)
    personal_note = models.TextField(blank=True)

    # --- SRS fields (SM-2 algorithm) ---
    easiness_factor = models.FloatField(default=2.5)
    """EF starts at 2.5, floor at 1.3. Controls how fast interval grows."""

    interval = models.IntegerField(default=0)
    """Days until next review. 0 = brand new card, 1 = learning, etc."""

    repetitions = models.IntegerField(default=0)
    """Consecutive correct answers (quality >= 3)."""

    next_review = models.DateTimeField(default=timezone.now)
    """When this card is due for review next."""

    last_reviewed = models.DateTimeField(null=True, blank=True)

    class Meta:
        unique_together = ("user", "word")
        ordering = ["-added_at"]
        indexes = [
            models.Index(fields=["user", "next_review"]),
        ]

    def __str__(self) -> str:
        return f"{self.user} saved {self.word}"


class TranslationCache(models.Model):
    """Persistent, user-agnostic cache of LLM-generated translations.

    Keyed by ``korean_normalized`` (lower-cased, whitespace-collapsed) so
    that trivial formatting differences ("한국어", " 한국어 ", "한국어\\n")
    all hit the same row.  Each row remembers how often it has been
    served so we can surface cost savings / audit quality in the admin.
    """

    TYPE_WORD = "word"
    TYPE_PHRASE = "phrase"
    TYPE_TEXT = "text"
    TYPE_CHOICES = [
        (TYPE_WORD, "Single word"),
        (TYPE_PHRASE, "Phrase / sentence"),
        (TYPE_TEXT, "Full text"),
    ]

    korean_text = models.TextField()
    korean_normalized = models.TextField(unique=True, db_index=True)

    translation_en = models.TextField()
    romanization = models.CharField(max_length=500, blank=True)
    part_of_speech = models.CharField(max_length=50, blank=True)

    example_sentences = models.JSONField(default=list, blank=True)
    formality_notes = models.TextField(blank=True)
    grammar_notes = models.TextField(blank=True)

    entry_type = models.CharField(
        max_length=10, choices=TYPE_CHOICES, default=TYPE_WORD
    )

    llm_model_used = models.CharField(max_length=100, default="mock")
    usage_count = models.IntegerField(default=1)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        indexes = [
            models.Index(fields=["korean_normalized"]),
            models.Index(fields=["entry_type"]),
        ]

    def __str__(self) -> str:
        return f"[{self.entry_type}] {self.korean_text[:40]}"

    @staticmethod
    def normalize(text: str) -> str:
        """Normalize Korean text to maximize cache hits.

        Strips, lowercases, collapses whitespace. Cheap enough to run on
        every request; keeps the DB cache's ``unique=True`` constraint
        doing real work.
        """
        return re.sub(r"\s+", " ", (text or "").strip().lower())
