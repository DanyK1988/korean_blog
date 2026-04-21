"""Viewsets for the personal dictionary."""
from datetime import date, timedelta

from django.utils import timezone
from rest_framework import mixins, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response

from .models import UserWord
from .serializers import (
    AddWordSerializer,
    ReviewSerializer,
    SavedWordSerializer,
    UpdateUserWordSerializer,
)
from .srs import preview_intervals, sm2_review


def _streak_days(user) -> int:
    """Consecutive days (ending today, UTC) the user has reviewed ≥1 card."""
    dates = (
        UserWord.objects.filter(user=user, last_reviewed__isnull=False)
        .values_list("last_reviewed", flat=True)
    )
    reviewed_days = {d.date() for d in dates}
    if not reviewed_days:
        return 0
    today = timezone.now().date()
    streak = 0
    cursor = today
    if today not in reviewed_days:
        # Allow the streak to still count if they've already reviewed
        # "yesterday" but not yet today — otherwise a user opening the
        # app at 00:01 would see their streak reset.
        cursor = today - timedelta(days=1)
        if cursor not in reviewed_days:
            return 0
    while cursor in reviewed_days:
        streak += 1
        cursor -= timedelta(days=1)
    return streak


class UserWordViewSet(
    mixins.ListModelMixin,
    mixins.CreateModelMixin,
    mixins.DestroyModelMixin,
    mixins.UpdateModelMixin,
    viewsets.GenericViewSet,
):
    """Manage the current user's personal dictionary.

    Endpoints
    ---------
    * ``GET    /api/words/``           — list saved words (search with ``?q=``)
    * ``POST   /api/words/``           — save a new word to the dictionary
    * ``PATCH  /api/words/<id>/``      — update the ``personal_note`` on a word
    * ``DELETE /api/words/<id>/``      — remove a word from the dictionary
    * ``GET    /api/words/due/``       — cards currently due for review
    * ``POST   /api/words/<id>/review/`` — submit a flashcard review
    * ``GET    /api/words/stats/``     — dashboard counters for the Study page
    """

    permission_classes = (permissions.IsAuthenticated,)

    def get_queryset(self):
        qs = UserWord.objects.select_related("word").filter(user=self.request.user)
        q = self.request.query_params.get("q")
        if q:
            qs = qs.filter(word__korean_word__icontains=q) | qs.filter(
                word__translation__icontains=q
            )
        return qs

    def get_serializer_class(self):
        if self.action == "create":
            return AddWordSerializer
        if self.action in {"update", "partial_update"}:
            return UpdateUserWordSerializer
        if self.action == "review":
            return ReviewSerializer
        return SavedWordSerializer

    def create(self, request, *args, **kwargs):
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        user_word = serializer.save()
        status_code = (
            status.HTTP_201_CREATED
            if getattr(serializer, "created", False)
            else status.HTTP_200_OK
        )
        return Response(SavedWordSerializer(user_word).data, status=status_code)

    def update(self, request, *args, **kwargs):
        partial = kwargs.pop("partial", False)
        instance = self.get_object()
        serializer = self.get_serializer(instance, data=request.data, partial=partial)
        serializer.is_valid(raise_exception=True)
        serializer.save()
        return Response(SavedWordSerializer(instance).data)

    # ------------------------------------------------------------------ SRS
    @action(detail=False, methods=["get"])
    def due(self, request):
        """List all cards whose ``next_review`` is in the past."""
        now = timezone.now()
        qs = (
            UserWord.objects.select_related("word")
            .filter(user=request.user, next_review__lte=now)
            .order_by("next_review")
        )
        serializer = SavedWordSerializer(qs, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=["post"])
    def review(self, request, pk=None):
        """Submit a review for a single card.

        Expects ``{"quality": 0-5}``. Returns the updated ``UserWord`` plus
        a ``preview`` object containing the interval each rating button
        *would* produce next time.
        """
        user_word = self.get_object()
        serializer = ReviewSerializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        sm2_review(user_word, serializer.validated_data["quality"])
        data = SavedWordSerializer(user_word).data
        data["preview"] = preview_intervals(user_word)
        return Response(data)

    @action(detail=False, methods=["get"])
    def stats(self, request):
        """Study-page dashboard counters."""
        now = timezone.now()
        user_qs = UserWord.objects.filter(user=request.user)

        due_today = user_qs.filter(next_review__lte=now).count()
        new_cards = user_qs.filter(repetitions=0, last_reviewed__isnull=True).count()
        total_words = user_qs.count()

        next_due = (
            user_qs.filter(next_review__gt=now)
            .order_by("next_review")
            .values_list("next_review", flat=True)
            .first()
        )

        return Response(
            {
                "due_today": due_today,
                "new_cards": new_cards,
                "total_words": total_words,
                "streak_days": _streak_days(request.user),
                "next_due": next_due,
            }
        )
