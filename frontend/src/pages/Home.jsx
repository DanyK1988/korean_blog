import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { postsApi } from "../api/endpoints.js";

/**
 * Home feed — a clean, text-forward vertical list of posts inspired by
 * the SavvyCal blog index (https://savvycal.com/articles). Each entry
 * stacks a bullet, bold title, description, and an author / date /
 * reading-time line, separated by thin rules. A hero image pulled from
 * ``/img/main_page.png`` sits above the feed on the landing page only.
 */

function formatDate(d) {
  if (!d) return "";
  return new Date(d).toLocaleDateString(undefined, {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

export default function Home() {
  const [state, setState] = useState({
    posts: [],
    count: 0,
    loading: true,
    error: null,
  });
  const [page, setPage] = useState(1);

  useEffect(() => {
    let cancelled = false;
    setState((s) => ({ ...s, loading: true }));
    postsApi
      .list({ page })
      .then((data) => {
        if (cancelled) return;
        setState({
          posts: data.results || [],
          count: data.count || 0,
          loading: false,
          error: null,
        });
        window.scrollTo({ top: 0, behavior: "smooth" });
      })
      .catch((err) => {
        if (cancelled) return;
        setState({
          posts: [],
          count: 0,
          loading: false,
          error: err.message || "Failed to load posts.",
        });
      });
    return () => {
      cancelled = true;
    };
  }, [page]);

  const { posts, count, loading, error } = state;
  const totalPages = Math.max(1, Math.ceil(count / 8));

  return (
    <div>
      {page === 1 && <Hero />}

      <section className="mx-auto max-w-5xl">

        {loading && <p className="text-muted">Loading posts…</p>}
        {error && <p className="text-accent-dark">{error}</p>}

        {!loading && !error && posts.length === 0 && (
          <p className="text-muted">No posts yet. Be the first to write one!</p>
        )}

        <ul className="grid gap-5 md:grid-cols-2">
          {posts.map((p) => (
            <li key={p.id}>
              <Link
                to={`/posts/${p.id}`}
                className="group flex h-full flex-col rounded-card border border-gray-100 bg-white p-5 shadow-card transition hover:border-accent/30 hover:shadow-pop md:p-6"
              >
                <h2 className="text-lg font-semibold leading-snug text-ink transition group-hover:text-accent md:text-xl">
                  {p.title}
                </h2>
                {p.excerpt && (
                  <p className="mt-2 line-clamp-3 flex-1 text-sm leading-relaxed text-muted md:text-[0.95rem]">
                    {p.excerpt}
                  </p>
                )}
                {p.tags && p.tags.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-1">
                    {p.tags.slice(0, 3).map((tag) => (
                      <span
                        key={tag}
                        className="rounded-full bg-paper px-2 py-0.5 text-[10px] font-medium text-muted"
                      >
                        #{tag}
                      </span>
                    ))}
                  </div>
                )}
                <div className="mt-4 flex flex-wrap items-center gap-x-2 gap-y-1 text-xs text-muted">
                  <span className="font-medium text-ink">
                    {p.author?.username || "Anonymous"}
                  </span>
                  <span aria-hidden>·</span>
                  <span>{formatDate(p.published_at || p.created_at)}</span>
                  {p.reading_minutes ? (
                    <>
                      <span aria-hidden>·</span>
                      <span>{p.reading_minutes} min read</span>
                    </>
                  ) : null}
                  {!p.published && (
                    <span className="ml-1 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-yellow-800">
                      Draft
                    </span>
                  )}
                </div>
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
    </div>
  );
}

// ---------------------------------------------------------------------------
// Hero
// ---------------------------------------------------------------------------

function Hero() {
  return (
    <section className="mb-12 text-center md:mb-16">
      <h1 className="mb-6 text-3xl font-bold tracking-tight text-ink md:mb-8 md:text-[2.75rem] md:leading-tight">
        The Korean Wave Blog
      </h1>

      <div className="overflow-hidden rounded-card bg-paper shadow-card">
        <img
          src="/img/main_page.png"
          alt="Korean Wave — 한글 블로그"
          className="mx-auto block h-64 w-full object-cover md:h-[380px] lg:h-[440px]"
          loading="eager"
        />
      </div>

      <div className="mx-auto mt-8 max-w-2xl md:mt-10">
        <p className="text-xs font-semibold uppercase tracking-[0.18em] text-accent">
          한글 블로그
        </p>
        <h2 className="mt-2 text-2xl font-bold leading-tight text-ink md:text-4xl">
          Learn Korean, one word at a time.
        </h2>
        <p className="mx-auto mt-3 max-w-xl text-sm text-muted md:text-base">
          Grammar explainers, vocabulary deep-dives, and an interactive
          dictionary built into every post.
        </p>
      </div>
    </section>
  );
}
