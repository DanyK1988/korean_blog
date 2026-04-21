"""Viewsets for blog posts."""
from django.db.models import Q
from rest_framework import viewsets
from rest_framework.decorators import action
from rest_framework.pagination import PageNumberPagination
from rest_framework.response import Response

from .models import Post
from .permissions import IsAuthorOrReadOnly
from .serializers import PostDetailSerializer, PostListSerializer


class PostsPagination(PageNumberPagination):
    page_size = 8


class PostViewSet(viewsets.ModelViewSet):
    """CRUD + custom ``publish`` action for blog posts.

    List behaviour
    --------------
    * Anonymous users see only published posts.
    * Authenticated users see all published posts plus their own drafts.
    """

    permission_classes = (IsAuthorOrReadOnly,)
    pagination_class = PostsPagination
    filterset_fields = ("author", "published")
    search_fields = ("title", "body")
    ordering_fields = ("created_at", "published_at", "title")

    def get_queryset(self):
        qs = Post.objects.select_related("author").all()
        user = self.request.user
        if self.action == "list":
            if user.is_authenticated:
                qs = qs.filter(Q(published=True) | Q(author=user))
            else:
                qs = qs.filter(published=True)
        return qs

    def get_serializer_class(self):
        if self.action == "list":
            return PostListSerializer
        return PostDetailSerializer

    def perform_create(self, serializer):
        serializer.save(author=self.request.user)

    @action(detail=True, methods=["post"], permission_classes=(IsAuthorOrReadOnly,))
    def publish(self, request, pk=None):
        """Toggle the ``published`` flag on a post (author only)."""
        post = self.get_object()
        post.published = not post.published
        post.save()
        return Response(PostDetailSerializer(post).data)
