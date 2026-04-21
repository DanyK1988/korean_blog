import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { postsApi, wordsApi } from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import KoreanTextRenderer from "../components/KoreanTextRenderer.jsx";
import TextTranslationPanel from "../components/TextTranslationPanel.jsx";

export default function PostDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();

  const [post, setPost] = useState(null);
  const [savedWords, setSavedWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [postData, wordsData] = await Promise.all([
          postsApi.get(id),
          user ? wordsApi.list().catch(() => ({ results: [] })) : Promise.resolve({ results: [] }),
        ]);
        if (cancelled) return;
        setPost(postData);
        setSavedWords(wordsData.results || []);
      } catch (e) {
        if (!cancelled) setError(e.response?.status === 404 ? "Post not found." : "Failed to load post.");
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => {
      cancelled = true;
    };
  }, [id, user]);

  const savedDict = useMemo(() => {
    const map = new Map();
    for (const w of savedWords) map.set(w.korean_word, w);
    return map;
  }, [savedWords]);

  function handleWordSaved(word, saved) {
    setSavedWords((prev) => [saved, ...prev.filter((w) => w.korean_word !== word)]);
  }

  function handlePhraseSaved(saved) {
    setSavedWords((prev) => [
      saved,
      ...prev.filter((w) => w.korean_word !== saved.korean_word),
    ]);
  }

  async function handleDelete() {
    if (!window.confirm("Delete this post? This cannot be undone.")) return;
    await postsApi.remove(id);
    navigate("/");
  }

  async function handleTogglePublish() {
    const updated = await postsApi.togglePublish(id);
    setPost(updated);
  }

  if (loading) return <p className="text-muted">Loading…</p>;
  if (error)
    return (
      <div>
        <p className="text-accent-dark">{error}</p>
        <Link to="/" className="btn-outline mt-4">
          ← Back to blog
        </Link>
      </div>
    );
  if (!post) return null;

  const isAuthor = user && post.author && user.id === post.author.id;

  return (
    <article className="card mx-auto max-w-3xl p-8 md:p-10">
      <Link to="/" className="mb-6 inline-block text-sm text-muted hover:text-accent">
        ← All posts
      </Link>
      <h1 className="font-ko text-3xl font-bold leading-tight md:text-4xl">{post.title}</h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        by <strong className="text-ink">{post.author?.username}</strong>
        {post.published_at && (
          <> · {new Date(post.published_at).toLocaleDateString()}</>
        )}
        {post.reading_minutes ? <> · {post.reading_minutes} min read</> : null}
        {!post.published && (
          <span className="ml-2 rounded-full bg-yellow-100 px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide text-yellow-800">
            Draft
          </span>
        )}
      </p>

      {!user && (
        <div className="mb-6 rounded-lg border border-accent-soft bg-accent-soft/40 px-4 py-3 text-sm text-accent-dark">
          <Link to="/login" className="font-medium hover:underline">Log in</Link>{" "}
          to click Korean words and save them to your personal dictionary.
        </div>
      )}

      {post.tags && post.tags.length > 0 && (
        <div className="mb-6 flex flex-wrap gap-1.5">
          {post.tags.map((t) => (
            <span
              key={t}
              className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium text-muted"
            >
              #{t}
            </span>
          ))}
        </div>
      )}

      <KoreanTextRenderer
        content={post.body}
        sourceType="post"
        sourceId={post.id}
        savedDict={savedDict}
        onSaveWord={handleWordSaved}
        onSavePhrase={handlePhraseSaved}
      />

      {user && (
        <TextTranslationPanel
          koreanText={post.body}
          textId={post.id}
          sourceType="post"
        />
      )}

      {isAuthor && (
        <div className="mt-10 flex flex-wrap gap-2 border-t border-gray-100 pt-6">
          <Link to={`/posts/${post.id}/edit`} className="btn-outline">
            Edit
          </Link>
          <button onClick={handleTogglePublish} className="btn-outline">
            {post.published ? "Unpublish" : "Publish"}
          </button>
          <button onClick={handleDelete} className="btn-ghost text-accent-dark">
            Delete
          </button>
        </div>
      )}
    </article>
  );
}
