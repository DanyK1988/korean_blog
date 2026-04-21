"""Serializers for the posts app."""
import re

from rest_framework import serializers
from taggit.serializers import TaggitSerializer, TagListSerializerField

from users.serializers import UserSerializer

from .models import Post

_TAG_RE = re.compile(r"<[^>]+>")


def _strip_tags(html: str) -> str:
    return _TAG_RE.sub(" ", html or "")


def _reading_minutes(html: str, wpm: int = 200) -> int:
    """Estimate reading time in minutes from a post body (HTML or plain).

    We normalise whitespace after stripping tags and round up so even a
    very short post shows at least "1 min read".
    """
    text = _strip_tags(html)
    words = len(text.split())
    return max(1, -(-words // wpm))  # ceil division


class PostListSerializer(TaggitSerializer, serializers.ModelSerializer):
    """Compact serializer for post lists (home feed)."""

    author = UserSerializer(read_only=True)
    excerpt = serializers.SerializerMethodField()
    reading_minutes = serializers.SerializerMethodField()
    tags = TagListSerializerField(required=False)

    class Meta:
        model = Post
        fields = (
            "id",
            "title",
            "excerpt",
            "reading_minutes",
            "tags",
            "author",
            "published",
            "published_at",
            "created_at",
        )

    def get_excerpt(self, obj: Post) -> str:
        text = _strip_tags(obj.body).strip()
        text = re.sub(r"\s+", " ", text)
        if len(text) <= 220:
            return text
        return text[:220].rsplit(" ", 1)[0] + "…"

    def get_reading_minutes(self, obj: Post) -> int:
        return _reading_minutes(obj.body)


class PostDetailSerializer(TaggitSerializer, serializers.ModelSerializer):
    """Full post body, used on the detail page."""

    author = UserSerializer(read_only=True)
    reading_minutes = serializers.SerializerMethodField()
    tags = TagListSerializerField(required=False)

    class Meta:
        model = Post
        fields = (
            "id",
            "title",
            "body",
            "reading_minutes",
            "tags",
            "author",
            "published",
            "published_at",
            "created_at",
            "changed_at",
        )
        read_only_fields = (
            "author",
            "reading_minutes",
            "published_at",
            "created_at",
            "changed_at",
        )

    def get_reading_minutes(self, obj: Post) -> int:
        return _reading_minutes(obj.body)
