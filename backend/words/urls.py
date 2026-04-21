"""URL routes for the personal dictionary."""
from rest_framework.routers import DefaultRouter

from .views import UserWordViewSet

router = DefaultRouter()
router.register(r"", UserWordViewSet, basename="user-word")

urlpatterns = router.urls
