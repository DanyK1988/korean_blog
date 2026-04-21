from django.contrib import admin

from .models import Post


@admin.register(Post)
class PostAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "author", "published", "published_at", "created_at")
    list_filter = ("published", "author")
    search_fields = ("title", "body")
