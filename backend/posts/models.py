"""Blog post model."""
from django.conf import settings
from django.db import models
from django.utils import timezone
from taggit.managers import TaggableManager


class Post(models.Model):
    """A blog post authored by a user.

    Notes
    -----
    * ``body`` may contain HTML or Markdown — the frontend is responsible for
      rendering it safely and for wrapping Korean tokens in an interactive
      component for the word-saver feature.
    * ``published_at`` is set automatically the first time ``published`` is
      flipped to ``True`` (see :meth:`save`).
    """

    title = models.CharField(max_length=300)
    body = models.TextField(help_text="HTML or Markdown content")
    author = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="posts",
    )
    published = models.BooleanField(default=False)
    created_at = models.DateTimeField(auto_now_add=True)
    published_at = models.DateTimeField(null=True, blank=True)
    changed_at = models.DateTimeField(auto_now=True)
    tags = TaggableManager(blank=True)

    class Meta:
        ordering = ["-created_at"]

    def __str__(self) -> str:
        return self.title

    def save(self, *args, **kwargs):
        if self.published and self.published_at is None:
            self.published_at = timezone.now()
        if not self.published:
            self.published_at = None
        super().save(*args, **kwargs)
