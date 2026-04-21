from django.contrib import admin

from .models import TranslationCache, UserWord, Word


@admin.register(Word)
class WordAdmin(admin.ModelAdmin):
    list_display = ("id", "korean_word", "translation", "romanization", "source_post")
    search_fields = ("korean_word", "translation", "romanization")


@admin.register(UserWord)
class UserWordAdmin(admin.ModelAdmin):
    list_display = ("id", "user", "word", "added_at")
    list_filter = ("user",)
    search_fields = ("word__korean_word", "word__translation", "user__email")


@admin.register(TranslationCache)
class TranslationCacheAdmin(admin.ModelAdmin):
    """Most-used translations float to the top — handy for spot-checking
    LLM quality and spotting prompts that need tuning."""

    list_display = (
        "korean_text",
        "entry_type",
        "translation_en",
        "llm_model_used",
        "usage_count",
        "created_at",
    )
    list_filter = ("entry_type", "llm_model_used")
    search_fields = ("korean_text", "translation_en")
    readonly_fields = (
        "korean_normalized",
        "usage_count",
        "llm_model_used",
        "created_at",
        "updated_at",
    )
    ordering = ("-usage_count",)
