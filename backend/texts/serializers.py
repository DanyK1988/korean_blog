"""Serializers for the texts app."""
import re

from rest_framework import serializers
from taggit.serializers import TaggitSerializer, TagListSerializerField

from users.serializers import UserSerializer

from .models import Text

_TAG_RE = re.compile(r"<[^>]+>")


def _strip_html(body: str) -> str:
    return re.sub(r"\s+", " ", _TAG_RE.sub(" ", body or "")).strip()


class TextListSerializer(TaggitSerializer, serializers.ModelSerializer):
    """Compact list representation: body truncated to 300 chars of plain text."""

    author = UserSerializer(read_only=True)
    tags = TagListSerializerField(required=False)
    body = serializers.SerializerMethodField()

    class Meta:
        model = Text
        fields = (
            "id",
            "title",
            "body",
            "level",
            "tags",
            "author",
            "created_at",
        )

    def get_body(self, obj: Text) -> str:
        stripped = _strip_html(obj.body)
        if len(stripped) <= 300:
            return stripped
        return stripped[:300].rsplit(" ", 1)[0] + "…"


class TextDetailSerializer(TaggitSerializer, serializers.ModelSerializer):
    """Full representation used on the Text detail page."""

    author = UserSerializer(read_only=True)
    tags = TagListSerializerField(required=False)

    class Meta:
        model = Text
        fields = (
            "id",
            "title",
            "body",
            "level",
            "tags",
            "author",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "author", "created_at", "updated_at")
