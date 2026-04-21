"""Korean reading-practice texts.

A ``Text`` is similar to a ``Post`` but is meant for *passive reading*
rather than opinionated blogging — users pick texts by difficulty and
tag, then save unfamiliar words or phrases to their personal
dictionary.
"""
from django.conf import settings
from django.db import models
from taggit.managers import TaggableManager


class Text(models.Model):
    """A chunk of Korean prose tagged and leveled for reading practice."""

    LEVEL_EASY = "easy"
    LEVEL_MIDDLE = "middle"
    LEVEL_ADVANCED = "advanced"
    LEVEL_CHOICES = [
        (LEVEL_EASY, "Easy"),
        (LEVEL_MIDDLE, "Middle"),
        (LEVEL_ADVANCED, "Advanced"),
    ]

    title = models.CharField(max_length=300)
    body = models.TextField(help_text="Korean text — HTML paragraph tags allowed")
    level = models.CharField(
        max_length=20,
        choices=LEVEL_CHOICES,
        default=LEVEL_EASY,
        db_index=True,
    )
    tags = TaggableManager(blank=True)
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="texts",
        null=True,
        blank=True,
    )
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return f"[{self.level}] {self.title}"
