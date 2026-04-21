"""URL routes for the texts app."""
from rest_framework.routers import DefaultRouter

from .views import TextViewSet

router = DefaultRouter()
router.register(r"", TextViewSet, basename="text")

urlpatterns = router.urls
