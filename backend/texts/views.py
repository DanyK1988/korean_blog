"""Viewsets for Korean reading-practice texts."""
from rest_framework import viewsets
from rest_framework.pagination import PageNumberPagination

from posts.permissions import IsAuthorOrReadOnly

from .models import Text
from .serializers import TextDetailSerializer, TextListSerializer


class TextsPagination(PageNumberPagination):
    page_size = 12


class TextViewSet(viewsets.ModelViewSet):
    """CRUD for reading-practice texts.

    Query params
    ------------
    * ``?level=easy|middle|advanced`` — filter by difficulty
    * ``?tags=grammar,particles``    — **all** listed tags must be present
    * ``?search=제목``                 — case-insensitive LIKE on title + body
    """

    permission_classes = (IsAuthorOrReadOnly,)
    pagination_class = TextsPagination
    search_fields = ("title", "body")
    ordering_fields = ("created_at", "title")

    def get_queryset(self):
        qs = Text.objects.select_related("author").prefetch_related("tags").all()
        params = self.request.query_params

        level = params.get("level")
        if level:
            qs = qs.filter(level=level)

        tags_param = params.get("tags", "").strip()
        if tags_param:
            tag_slugs = [t.strip() for t in tags_param.split(",") if t.strip()]
            # AND-match: the text must carry *every* tag listed.
            for tag in tag_slugs:
                qs = qs.filter(tags__name__iexact=tag)
            qs = qs.distinct()

        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return TextListSerializer
        return TextDetailSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)
