from django.contrib import admin

from .models import Text


@admin.register(Text)
class TextAdmin(admin.ModelAdmin):
    list_display = ("id", "title", "level", "author", "created_at")
    list_filter = ("level",)
    search_fields = ("title", "body")
