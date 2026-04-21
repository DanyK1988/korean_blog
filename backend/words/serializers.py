"""Serializers for the words app.

The API surface is modelled around the ``UserWord`` row, not ``Word`` — a
``Word`` row is shared across users, but every user has their own
``UserWord`` (with a ``personal_note`` and a ``added_at`` timestamp) pointing
at it.  The serializer below "flattens" the two tables so the frontend only
has to deal with a single object.
"""
from rest_framework import serializers

from .models import UserWord, Word


class _SourceRefSerializer(serializers.Serializer):
    """Tiny nested payload: ``{id, title}`` for post/text back-references."""

    id = serializers.IntegerField()
    title = serializers.CharField()


class SavedWordSerializer(serializers.ModelSerializer):
    """Flat representation of a ``UserWord`` + its underlying ``Word``.

    Also includes the SM-2 scheduling fields so the Study page can render
    intervals / due-dates without a second round-trip.
    """

    korean_word = serializers.CharField(source="word.korean_word", read_only=True)
    translation = serializers.CharField(source="word.translation", read_only=True)
    romanization = serializers.CharField(
        source="word.romanization", read_only=True, allow_blank=True
    )
    example_sentence = serializers.CharField(
        source="word.example_sentence", read_only=True, allow_blank=True
    )
    is_phrase = serializers.BooleanField(source="word.is_phrase", read_only=True)
    context_sentence = serializers.CharField(
        source="word.context_sentence", read_only=True, allow_blank=True
    )
    source_type = serializers.CharField(source="word.source_type", read_only=True)
    source_post_id = serializers.IntegerField(
        source="word.source_post_id", read_only=True, allow_null=True
    )
    source_text_id = serializers.IntegerField(
        source="word.source_text_id", read_only=True, allow_null=True
    )
    source_post = serializers.SerializerMethodField()
    source_text = serializers.SerializerMethodField()

    class Meta:
        model = UserWord
        fields = (
            "id",
            "korean_word",
            "translation",
            "romanization",
            "example_sentence",
            "is_phrase",
            "context_sentence",
            "source_type",
            "source_post_id",
            "source_text_id",
            "source_post",
            "source_text",
            "personal_note",
            "added_at",
            # SRS fields
            "easiness_factor",
            "interval",
            "repetitions",
            "next_review",
            "last_reviewed",
        )
        read_only_fields = tuple(
            f
            for f in (
                "id",
                "added_at",
                "easiness_factor",
                "interval",
                "repetitions",
                "next_review",
                "last_reviewed",
                "korean_word",
                "translation",
                "romanization",
                "example_sentence",
                "is_phrase",
                "context_sentence",
                "source_type",
                "source_post_id",
                "source_text_id",
                "source_post",
                "source_text",
            )
        )

    def get_source_post(self, obj: UserWord):
        post = obj.word.source_post
        return {"id": post.id, "title": post.title} if post else None

    def get_source_text(self, obj: UserWord):
        text = obj.word.source_text
        return {"id": text.id, "title": text.title} if text else None


class AddWordSerializer(serializers.Serializer):
    """Payload for ``POST /api/words/`` (save a word *or phrase*)."""

    korean_word = serializers.CharField(max_length=500)
    translation = serializers.CharField(max_length=1000)
    romanization = serializers.CharField(
        max_length=500, required=False, allow_blank=True
    )
    example_sentence = serializers.CharField(required=False, allow_blank=True)
    context_sentence = serializers.CharField(
        max_length=1000, required=False, allow_blank=True
    )
    is_phrase = serializers.BooleanField(required=False, default=False)
    source_type = serializers.ChoiceField(
        choices=Word.SOURCE_TYPE_CHOICES,
        required=False,
        default=Word.SOURCE_MANUAL,
    )
    source_post_id = serializers.IntegerField(required=False, allow_null=True)
    source_text_id = serializers.IntegerField(required=False, allow_null=True)
    personal_note = serializers.CharField(required=False, allow_blank=True)

    def validate(self, attrs):
        # Auto-derive ``source_type`` when only the corresponding id is
        # provided, so callers don't have to remember both fields.
        if attrs.get("source_post_id") and not attrs.get("source_type"):
            attrs["source_type"] = Word.SOURCE_POST
        elif attrs.get("source_text_id") and not attrs.get("source_type"):
            attrs["source_type"] = Word.SOURCE_TEXT
        return attrs

    def save(self, **kwargs):  # type: ignore[override]
        """Get-or-create a ``UserWord`` for the current user.

        De-duplication is scoped to ``(user, korean_word)`` — if the user
        already has a row with the same Korean text in their dictionary, we
        return that existing row unchanged instead of creating a duplicate.
        The view uses ``self.created`` to decide on the HTTP status code.
        """
        data = self.validated_data
        user = self.context["request"].user
        korean = data["korean_word"].strip()

        existing = (
            UserWord.objects.select_related("word")
            .filter(user=user, word__korean_word=korean)
            .first()
        )
        if existing is not None:
            self.created = False
            self.instance = existing
            return existing

        word = Word.objects.create(
            korean_word=korean,
            translation=data["translation"],
            romanization=data.get("romanization", ""),
            example_sentence=data.get("example_sentence", ""),
            context_sentence=data.get("context_sentence", ""),
            is_phrase=data.get("is_phrase", False),
            source_type=data.get("source_type", Word.SOURCE_MANUAL),
            source_post_id=data.get("source_post_id") or None,
            source_text_id=data.get("source_text_id") or None,
        )
        user_word = UserWord.objects.create(
            user=user,
            word=word,
            personal_note=data.get("personal_note", ""),
        )
        self.created = True
        self.instance = user_word
        return user_word


class UpdateUserWordSerializer(serializers.ModelSerializer):
    """PATCH endpoint — currently only ``personal_note`` is editable."""

    class Meta:
        model = UserWord
        fields = ("personal_note",)


class ReviewSerializer(serializers.Serializer):
    """Payload for ``POST /api/words/<id>/review/``."""

    quality = serializers.IntegerField(min_value=0, max_value=5)
