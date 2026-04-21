"""Root URL configuration."""
from django.contrib import admin
from django.urls import include, path
from rest_framework_simplejwt.views import TokenRefreshView

from users.views import LoginView, MeView, RegisterView

urlpatterns = [
    path("admin/", admin.site.urls),
    # Auth endpoints
    path("api/auth/register/", RegisterView.as_view(), name="auth-register"),
    path("api/auth/login/", LoginView.as_view(), name="auth-login"),
    path("api/auth/token/refresh/", TokenRefreshView.as_view(), name="token-refresh"),
    path("api/auth/me/", MeView.as_view(), name="auth-me"),
    # Resource endpoints
    path("api/posts/", include("posts.urls")),
    path("api/words/", include("words.urls")),
    path("api/texts/", include("texts.urls")),
    path("api/translate/", include("words.translation_urls")),
]
