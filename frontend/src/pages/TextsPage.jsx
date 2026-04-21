import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { getTexts } from "../api/texts.js";

/**
 * Listing page for reading-practice texts.
 *
 * Offers a level filter (All · Easy · Middle · Advanced), a tag filter
 * (union of tags across the current result set), and a responsive card
 * grid that mirrors the Blog home layout.
 */

const LEVELS = [
  { id: "all", label: "All" },
  { id: "easy", label: "Easy" },
  { id: "middle", label: "Middle" },
  { id: "advanced", label: "Advanced" },
];

const LEVEL_BADGE = {
  easy: "bg-green-100 text-green-700",
  middle: "bg-yellow-100 text-yellow-700",
  advanced: "bg-red-100 text-red-700",
};

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function TextsPage() {
  const [texts, setTexts] = useState([]);
  const [count, setCount] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  // Filters
  const [level, setLevel] = useState("all");
  const [activeTags, setActiveTags] = useState([]); // array of tag strings

  // All tags we've ever seen (across loaded pages) — used to build the tag
  // chip row. Remembering them is pleasant UX: chips don't vanish when the
  // user applies a filter that happens to exclude them.
  const [knownTags, setKnownTags] = useState([]);

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    const params = { page };
    if (level !== "all") params.level = level;
    if (activeTags.length) params.tags = activeTags.join(",");

    getTexts(params)
      .then((data) => {
        if (cancelled) return;
        const results = data.results || [];
        setTexts(results);
        setCount(data.count || 0);
        setKnownTags((prev) => {
          const s = new Set(prev);
          for (const t of results) for (const tag of t.tags || []) s.add(tag);
          return Array.from(s).sort();
        });
        setError(null);
      })
      .catch((err) => {
        if (cancelled) return;
        setError(err.message || "Failed to load texts.");
        setTexts([]);
        setCount(0);
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => {
      cancelled = true;
    };
  }, [page, level, activeTags]);

  // When filters change, jump back to page 1.
  useEffect(() => setPage(1), [level, activeTags]);

  const totalPages = useMemo(() => Math.max(1, Math.ceil(count / 12)), [count]);

  function toggleTag(tag) {
    setActiveTags((cur) =>
      cur.includes(tag) ? cur.filter((t) => t !== tag) : [...cur, tag]
    );
  }

  return (
    <section className="mx-auto max-w-5xl">
      <header className="mb-8">
        <h1 className="text-3xl font-bold tracking-tight text-ink md:text-[2.5rem] md:leading-tight">
          읽기 연습 — Reading Practice
        </h1>
        <p className="mt-3 max-w-2xl text-base text-muted md:text-lg">
          Click any word or select a phrase to add it to your dictionary.
        </p>
      </header>

      {/* Level filter */}
      <div className="mb-3 flex flex-wrap gap-2">
        {LEVELS.map((opt) => {
          const active = level === opt.id;
          return (
            <button
              key={opt.id}
              onClick={() => setLevel(opt.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-accent text-white shadow-sm"
                  : "border border-gray-200 bg-white text-muted hover:border-accent/40 hover:text-ink"
              }`}
            >
              {opt.label}
            </button>
          );
        })}
      </div>

      {/* Tag filter — horizontal scroll row */}
      {knownTags.length > 0 && (
        <div className="mb-8 -mx-1 flex gap-2 overflow-x-auto pb-2">
          {knownTags.map((tag) => {
            const active = activeTags.includes(tag);
            return (
              <button
                key={tag}
                onClick={() => toggleTag(tag)}
                className={`shrink-0 rounded-full border px-3 py-1 text-xs font-medium transition ${
                  active
                    ? "border-accent bg-accent-soft text-accent-dark"
                    : "border-gray-200 bg-white text-muted hover:border-gray-300"
                }`}
              >
                #{tag}
              </button>
            );
          })}
          {activeTags.length > 0 && (
            <button
              onClick={() => setActiveTags([])}
              className="shrink-0 rounded-full px-3 py-1 text-xs font-medium text-muted hover:text-ink"
            >
              Clear
            </button>
          )}
        </div>
      )}

      {loading && <p className="text-muted">Loading texts…</p>}
      {error && <p className="text-accent-dark">{error}</p>}

      {!loading && !error && texts.length === 0 && (
        <p className="text-muted">
          No texts match those filters. Try clearing some.
        </p>
      )}

      <ul className="grid gap-5 md:grid-cols-2">
        {texts.map((t) => (
          <li key={t.id}>
            <Link
              to={`/texts/${t.id}`}
              className="group flex h-full flex-col rounded-card border border-gray-100 bg-white p-5 shadow-card transition hover:border-accent/30 hover:shadow-pop"
            >
              <div className="mb-2 flex items-center gap-2">
                <span
                  className={`rounded-full px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide ${
                    LEVEL_BADGE[t.level] || "bg-paper text-muted"
                  }`}
                >
                  {t.level}
                </span>
                <span className="text-xs text-muted">
                  {formatDate(t.created_at)}
                </span>
              </div>
              <h2 className="font-ko text-lg font-semibold leading-snug text-ink transition group-hover:text-accent">
                {t.title}
              </h2>
              <p
                lang="ko"
                className="font-ko mt-2 line-clamp-4 text-sm text-muted"
              >
                {t.body}
              </p>
              {t.tags && t.tags.length > 0 && (
                <div className="mt-4 flex flex-wrap gap-1">
                  {t.tags.slice(0, 4).map((tag) => (
                    <span
                      key={tag}
                      className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-medium text-muted"
                    >
                      #{tag}
                    </span>
                  ))}
                </div>
              )}
            </Link>
          </li>
        ))}
      </ul>

      {totalPages > 1 && (
        <div className="mt-10 flex items-center justify-center gap-2 border-t border-gray-100 pt-8">
          <button
            className="btn-outline"
            disabled={page <= 1}
            onClick={() => setPage((p) => p - 1)}
          >
            ← Previous
          </button>
          <span className="text-sm text-muted">
            Page {page} of {totalPages}
          </span>
          <button
            className="btn-outline"
            disabled={page >= totalPages}
            onClick={() => setPage((p) => p + 1)}
          >
            Next →
          </button>
        </div>
      )}
    </section>
  );
}
