"""SM-2 spaced-repetition algorithm.

Reference
---------
The SuperMemo 2 algorithm as published by Piotr Woźniak:
https://www.supermemo.com/en/archives1990-2015/english/ol/sm2

Each ``UserWord`` carries three pieces of scheduling state:

* ``easiness_factor`` (EF) — float, >= 1.3, starts at 2.5
* ``interval`` — days between this review and the next
* ``repetitions`` — number of consecutive correct answers

``quality`` is an integer 0-5 describing how well the user recalled the
card:

=====  =====================================================================
  0    complete blackout
  1    wrong — but remembered the answer on seeing it
  2    wrong — but easy to recall the correct answer
  3    correct — with significant difficulty
  4    correct — with some hesitation
  5    perfect recall
=====  =====================================================================
"""
from __future__ import annotations

from dataclasses import dataclass
from datetime import timedelta
from typing import TYPE_CHECKING

from django.utils import timezone

if TYPE_CHECKING:
    from .models import UserWord


MIN_EF = 1.3
DEFAULT_EF = 2.5


@dataclass(frozen=True)
class SrsState:
    """Snapshot of scheduling state — used for both input and previews."""

    easiness_factor: float
    interval: int
    repetitions: int


def next_state(state: SrsState, quality: int) -> SrsState:
    """Return the state a card would have *after* a review of ``quality``.

    This is a pure function with no side effects — it's used both by
    :func:`sm2_review` (to actually persist the review) and by the
    ``/stats/`` endpoint so the frontend can label the rating buttons
    with their resulting intervals.
    """
    if not 0 <= quality <= 5:
        raise ValueError("quality must be in [0, 5]")

    ef = state.easiness_factor
    reps = state.repetitions
    interval = state.interval

    if quality < 3:
        reps = 0
        interval = 1
    else:
        if reps == 0:
            interval = 1
        elif reps == 1:
            interval = 6
        else:
            interval = round(interval * ef)
        reps += 1

    ef = ef + (0.1 - (5 - quality) * (0.08 + (5 - quality) * 0.02))
    ef = max(MIN_EF, ef)

    return SrsState(easiness_factor=ef, interval=interval, repetitions=reps)


def sm2_review(user_word: "UserWord", quality: int) -> "UserWord":
    """Apply SM-2 to ``user_word`` in place and persist the result."""
    current = SrsState(
        easiness_factor=user_word.easiness_factor,
        interval=user_word.interval,
        repetitions=user_word.repetitions,
    )
    updated = next_state(current, quality)
    now = timezone.now()

    user_word.easiness_factor = updated.easiness_factor
    user_word.repetitions = updated.repetitions
    user_word.interval = updated.interval
    user_word.next_review = now + timedelta(days=updated.interval)
    user_word.last_reviewed = now
    user_word.save(
        update_fields=[
            "easiness_factor",
            "repetitions",
            "interval",
            "next_review",
            "last_reviewed",
        ]
    )
    return user_word


def preview_intervals(user_word: "UserWord") -> dict[int, int]:
    """Return ``{quality: resulting_interval_days}`` for the 4 rating buttons.

    Useful for labelling the Again/Hard/Good/Easy buttons in the UI.
    """
    current = SrsState(
        easiness_factor=user_word.easiness_factor,
        interval=user_word.interval,
        repetitions=user_word.repetitions,
    )
    return {q: next_state(current, q).interval for q in (1, 2, 4, 5)}
