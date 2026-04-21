import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import { getDueWords, submitReview } from "../api/words.js";
import { useStats } from "../context/StatsContext.jsx";
import Flashcard from "../components/Flashcard.jsx";
import RatingButtons from "../components/RatingButtons.jsx";
import StudyProgress from "../components/StudyProgress.jsx";

/**
 * The core session state machine for the Study page.
 *
 * ``queue`` is the *local* session queue — never re-fetched mid-session
 * because we want the order to be stable, and because "Again" / "Hard"
 * ratings need to push the card back to the end of the same session
 * without clashing with the server's ``next_review`` timestamp (which
 * might be seconds in the future due to SM-2's ``interval = 1``).
 */
const FLIP_MS = 400;
const LEAVE_MS = 280;

function clientPreviewIntervals(card) {
  /* Replicates backend words/srs.py `next_state` for the 4 rating buttons,
   * so Again/Hard/Good/Easy can show their resulting intervals *before* the
   * first server round-trip in a session.
   */
  const ef = card.easiness_factor ?? 2.5;
  const reps = card.repetitions ?? 0;
  const interval = card.interval ?? 0;

  const compute = (quality) => {
    let nextReps = reps;
    let nextInterval = interval;
    if (quality < 3) {
      nextReps = 0;
      nextInterval = 1;
    } else {
      if (reps === 0) nextInterval = 1;
      else if (reps === 1) nextInterval = 6;
      else nextInterval = Math.round(interval * ef);
      nextReps = reps + 1;
    }
    return nextInterval;
  };

  return { 1: compute(1), 2: compute(2), 4: compute(4), 5: compute(5) };
}

function formatNextDue(iso) {
  if (!iso) return null;
  const next = new Date(iso);
  const now = new Date();
  const diffMs = next - now;
  const diffMin = Math.max(0, Math.round(diffMs / 60000));
  const diffHours = Math.round(diffMs / (1000 * 60 * 60));

  if (diffMin < 60) return `in ${diffMin} min`;
  if (diffHours < 24) return `in ${diffHours} hours`;

  const sameDay = next.toDateString() === now.toDateString();
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const isTomorrow = next.toDateString() === tomorrow.toDateString();
  const timeStr = next.toLocaleTimeString([], { hour: "numeric", minute: "2-digit" });
  if (sameDay) return `Today at ${timeStr}`;
  if (isTomorrow) return `Tomorrow at ${timeStr}`;
  return next.toLocaleString([], {
    weekday: "short",
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

export default function StudyPage() {
  const { stats, refresh: refreshStats } = useStats();

  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(null);

  const [queue, setQueue] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [flipped, setFlipped] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [busy, setBusy] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [counts, setCounts] = useState({ again: 0, hard: 0, good: 0, reviewed: 0 });
  const [serverPreviews, setServerPreviews] = useState(null);

  const advanceTimerRef = useRef(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const data = await getDueWords();
        if (cancelled) return;
        setQueue(data);
        setCurrentIndex(0);
        setFlipped(false);
        setCounts({ again: 0, hard: 0, good: 0, reviewed: 0 });
        setLoadError(null);
      } catch (err) {
        if (!cancelled) {
          setLoadError("Could not load your review queue. Please try again.");
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
      if (advanceTimerRef.current) clearTimeout(advanceTimerRef.current);
    };
  }, []);

  const currentCard = queue[currentIndex];
  const sessionDone = !loading && queue.length > 0 && currentIndex >= queue.length;

  const previews = useMemo(() => {
    if (serverPreviews) return serverPreviews;
    if (!currentCard) return null;
    return clientPreviewIntervals(currentCard);
  }, [serverPreviews, currentCard]);

  function handleShowAnswer() {
    if (!currentCard) return;
    setFlipped(true);
  }

  async function handleRate(quality) {
    if (!currentCard || busy) return;
    setBusy(true);
    setReviewError("");
    try {
      const updated = await submitReview(currentCard.id, quality);
      setServerPreviews(updated.preview || null);

      setCounts((c) => ({
        again: c.again + (quality === 1 ? 1 : 0),
        hard: c.hard + (quality === 2 ? 1 : 0),
        good: c.good + (quality >= 4 ? 1 : 0),
        reviewed: c.reviewed + 1,
      }));

      // Animate the card out, then either advance or requeue.
      setLeaving(true);
      advanceTimerRef.current = setTimeout(() => {
        setQueue((q) => {
          const next = [...q];
          if (quality < 3) {
            // Move the current card to the back of the local session queue.
            const [card] = next.splice(currentIndex, 1);
            next.push({ ...card, ...updated });
            return next;
          }
          next[currentIndex] = { ...next[currentIndex], ...updated };
          return next;
        });

        if (quality >= 3) {
          setCurrentIndex((i) => i + 1);
        }
        setFlipped(false);
        setLeaving(false);
        setServerPreviews(null);
        setBusy(false);
        refreshStats();
      }, LEAVE_MS);
    } catch (err) {
      setReviewError(
        err.response?.data?.detail ||
          "Could not save your review. Check your connection and try again."
      );
      setBusy(false);
    }
  }

  // --------------------------------------------------------------- RENDER

  if (loading) {
    return <p className="text-center text-muted">Loading your deck…</p>;
  }
  if (loadError) {
    return (
      <div className="mx-auto max-w-lg rounded-card border border-red-100 bg-red-50 p-6 text-center text-sm text-red-700">
        {loadError}
      </div>
    );
  }

  if (queue.length === 0 && stats.total_words === 0) {
    return <EmptyDictionary />;
  }
  if (queue.length === 0) {
    return <NothingDue nextDue={stats.next_due} />;
  }
  if (sessionDone) {
    return (
      <SessionComplete
        reviewed={counts.reviewed}
        nextDue={stats.next_due}
      />
    );
  }

  return (
    <section>
      <header className="mx-auto mb-6 max-w-lg text-center">
        <h1 className="font-ko text-2xl font-bold md:text-3xl">학습 시간</h1>
        <p className="mt-1 text-sm text-muted">
          Spaced-repetition flashcards · {stats.streak_days}-day streak
        </p>
      </header>

      <StudyProgress
        current={currentIndex}
        total={queue.length}
        counts={counts}
      />

      <Flashcard
        card={currentCard}
        flipped={flipped}
        leaving={leaving}
        onShowAnswer={handleShowAnswer}
      />

      {flipped && (
        <div className="mx-auto flex w-full max-w-lg flex-col items-center">
          <RatingButtons
            previews={previews}
            disabled={busy}
            onRate={handleRate}
          />
          {reviewError && (
            <p className="mt-3 text-xs text-accent-dark">{reviewError}</p>
          )}
        </div>
      )}
    </section>
  );
}

// ===========================================================================
// Empty / complete states
// ===========================================================================

function EmptyDictionary() {
  return (
    <div className="mx-auto max-w-lg card p-10 text-center">
      <CelebrationIcon muted />
      <h2 className="mt-4 text-xl font-semibold">Your dictionary is empty</h2>
      <p className="mt-2 text-sm text-muted">
        Read a post and click any Korean word to add it to your dictionary —
        once you have a few saved, come back here to study them.
      </p>
      <Link to="/" className="btn-primary mt-6">
        Browse the blog
      </Link>
    </div>
  );
}

function NothingDue({ nextDue }) {
  const label = formatNextDue(nextDue);
  return (
    <div className="mx-auto max-w-lg card p-10 text-center">
      <CelebrationIcon />
      <h2 className="mt-4 text-xl font-semibold">Nothing to review right now!</h2>
      <p className="mt-2 text-sm text-muted">
        {label
          ? <>Your next card is due <strong className="text-ink">{label}</strong>.</>
          : "Save a few Korean words from a post and they'll show up here."}
      </p>
      <div className="mt-6 flex justify-center gap-2">
        <Link to="/" className="btn-outline">Back to blog</Link>
        <Link to="/dictionary" className="btn-ghost">My dictionary</Link>
      </div>
    </div>
  );
}

function SessionComplete({ reviewed, nextDue }) {
  const label = formatNextDue(nextDue);
  return (
    <div className="mx-auto max-w-lg card p-10 text-center">
      <CelebrationIcon />
      <h2 className="mt-4 text-2xl font-bold">Session complete!</h2>
      <p className="mt-2 text-sm text-muted">
        You reviewed <strong className="text-ink">{reviewed}</strong>{" "}
        {reviewed === 1 ? "word" : "words"} this session.
      </p>
      {label && (
        <p className="mt-1 text-sm text-muted">
          Next review: <strong className="text-ink">{label}</strong>
        </p>
      )}
      <div className="mt-6 flex justify-center gap-2">
        <Link to="/" className="btn-primary">Back to blog</Link>
        <Link to="/dictionary" className="btn-ghost">My dictionary</Link>
      </div>
    </div>
  );
}

function CelebrationIcon({ muted }) {
  const stroke = muted ? "#9ca3af" : "#e05c5c";
  return (
    <svg
      className="mx-auto h-14 w-14"
      viewBox="0 0 52 52"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden
    >
      <circle cx="26" cy="26" r="24" stroke={stroke} strokeWidth="2.5" />
      <path
        d="M16 27.5 L23 34 L37 19"
        stroke={stroke}
        strokeWidth="3"
        strokeLinecap="round"
        strokeLinejoin="round"
        fill="none"
      />
    </svg>
  );
}
