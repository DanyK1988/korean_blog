from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as DjangoUserAdmin

from .models import User


@admin.register(User)
class UserAdmin(DjangoUserAdmin):
    list_display = ("id", "username", "email", "native_language", "is_staff")
    search_fields = ("username", "email")
    ordering = ("email",)

    fieldsets = DjangoUserAdmin.fieldsets + (
        ("Korean Blog profile", {"fields": ("native_language", "bio", "avatar")}),
    )
