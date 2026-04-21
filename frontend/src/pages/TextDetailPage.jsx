import { useEffect, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { getTextById } from "../api/texts.js";
import { wordsApi } from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import KoreanTextRenderer from "../components/KoreanTextRenderer.jsx";
import TextTranslationPanel from "../components/TextTranslationPanel.jsx";

const LEVEL_BADGE = {
  easy: "bg-green-100 text-green-700",
  middle: "bg-yellow-100 text-yellow-700",
  advanced: "bg-red-100 text-red-700",
};

export default function TextDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();

  const [text, setText] = useState(null);
  const [savedWords, setSavedWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const [textData, wordsData] = await Promise.all([
          getTextById(id),
          user
            ? wordsApi.list().catch(() => ({ results: [] }))
            : Promise.resolve({ results: [] }),
        ]);
        if (cancelled) return;
        setText(textData);
        setSavedWords(wordsData.results || []);
      } catch (e) {
        if (cancelled) return;
        setError(
          e.response?.status === 404
            ? "Text not found."
            : "Failed to load text."
        );
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

  function handleSaved(_wordOrKey, saved) {
    // ``KoreanWord`` calls us as (word, saved); ``PhraseSavePopover`` calls as
    // (saved). Support both by detecting which form of args we got.
    const entry = saved || _wordOrKey;
    if (!entry || !entry.korean_word) return;
    setSavedWords((prev) => [
      entry,
      ...prev.filter((w) => w.korean_word !== entry.korean_word),
    ]);
  }

  if (loading) return <p className="text-muted">Loading…</p>;
  if (error)
    return (
      <div>
        <p className="text-accent-dark">{error}</p>
        <Link to="/texts" className="btn-outline mt-4">
          ← All texts
        </Link>
      </div>
    );
  if (!text) return null;

  return (
    <article className="card mx-auto max-w-3xl p-8 md:p-10">
      <Link
        to="/texts"
        className="mb-6 inline-block text-sm text-muted hover:text-accent"
      >
        ← All texts
      </Link>

      <div className="mb-3 flex flex-wrap items-center gap-2">
        <span
          className={`rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-wide ${
            LEVEL_BADGE[text.level] || "bg-paper text-muted"
          }`}
        >
          {text.level}
        </span>
        {text.tags?.map((tag) => (
          <span
            key={tag}
            className="rounded-full bg-paper px-2.5 py-1 text-[11px] font-medium text-muted"
          >
            #{tag}
          </span>
        ))}
      </div>

      <h1 className="font-ko text-3xl font-bold leading-tight md:text-4xl">
        {text.title}
      </h1>
      <p className="mt-2 mb-6 text-sm text-muted">
        {text.author?.username && (
          <>
            by <strong className="text-ink">{text.author.username}</strong> ·{" "}
          </>
        )}
        {new Date(text.created_at).toLocaleDateString()}
      </p>

      {!user && (
        <div className="mb-6 rounded-lg border border-accent-soft bg-accent-soft/40 px-4 py-3 text-sm text-accent-dark">
          <Link to="/login" className="font-medium hover:underline">
            Log in
          </Link>{" "}
          to click words or select phrases and save them to your personal
          dictionary.
        </div>
      )}

      <KoreanTextRenderer
        content={text.body}
        sourceType="text"
        sourceId={text.id}
        savedDict={savedDict}
        onSaveWord={handleSaved}
        onSavePhrase={handleSaved}
      />

      {user && (
        <TextTranslationPanel
          koreanText={text.body}
          textId={text.id}
          sourceType="text"
        />
      )}
    </article>
  );
}
