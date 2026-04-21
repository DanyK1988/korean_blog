import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { wordsApi } from "../api/endpoints.js";
import AddWordModal from "../components/AddWordModal.jsx";

/**
 * Personal dictionary.
 *
 * Two axes of filtering:
 *
 * * **View** — Words / Phrases / All tabs at the top
 * * **Search** — fuzzy contains-match on korean_word, translation, romanization
 *
 * Each entry also displays where it was saved from (Post title, Text title,
 * or "added manually"), linking back to the source where possible.
 */

const VIEW_TABS = [
  { id: "all", label: "All" },
  { id: "words", label: "Words" },
  { id: "phrases", label: "Phrases" },
];

export default function Dictionary() {
  const [words, setWords] = useState([]);
  const [loading, setLoading] = useState(true);
  const [query, setQuery] = useState("");
  const [view, setView] = useState("all");
  const [editingId, setEditingId] = useState(null);
  const [draftNote, setDraftNote] = useState("");
  const [showAdd, setShowAdd] = useState(false);

  useEffect(() => {
    let cancelled = false;
    wordsApi.list().then((data) => {
      if (!cancelled) {
        setWords(data.results || []);
        setLoading(false);
      }
    });
    return () => {
      cancelled = true;
    };
  }, []);

  const filtered = useMemo(() => {
    let list = words;
    if (view === "words") list = list.filter((w) => !w.is_phrase);
    else if (view === "phrases") list = list.filter((w) => w.is_phrase);

    const q = query.trim().toLowerCase();
    if (!q) return list;
    return list.filter(
      (w) =>
        w.korean_word.toLowerCase().includes(q) ||
        w.translation.toLowerCase().includes(q) ||
        (w.romanization || "").toLowerCase().includes(q)
    );
  }, [query, words, view]);

  const counts = useMemo(
    () => ({
      all: words.length,
      words: words.filter((w) => !w.is_phrase).length,
      phrases: words.filter((w) => w.is_phrase).length,
    }),
    [words]
  );

  async function handleDelete(id) {
    if (!window.confirm("Remove this entry from your dictionary?")) return;
    await wordsApi.remove(id);
    setWords((ws) => ws.filter((w) => w.id !== id));
  }

  function startEdit(word) {
    setEditingId(word.id);
    setDraftNote(word.personal_note || "");
  }

  async function saveNote(id) {
    const updated = await wordsApi.updateNote(id, draftNote);
    setWords((ws) => ws.map((w) => (w.id === id ? { ...w, ...updated } : w)));
    setEditingId(null);
    setDraftNote("");
  }

  function handleAdded(entry) {
    setWords((ws) => {
      // Dedup in case the API returned an existing row (HTTP 200).
      const without = ws.filter((w) => w.id !== entry.id);
      return [entry, ...without];
    });
    setShowAdd(false);
  }

  return (
    <section>
      <header className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-ko text-3xl font-bold">내 단어장</h1>
          <p className="text-sm text-muted">
            Your personal dictionary · {counts.words} word
            {counts.words === 1 ? "" : "s"} · {counts.phrases} phrase
            {counts.phrases === 1 ? "" : "s"}
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <input
            className="input max-w-xs"
            placeholder="Search words, phrases, translations…"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
          />
          <button
            onClick={() => setShowAdd(true)}
            className="btn-primary whitespace-nowrap"
          >
            + Add word
          </button>
        </div>
      </header>

      {showAdd && (
        <AddWordModal
          onClose={() => setShowAdd(false)}
          onAdded={handleAdded}
        />
      )}

      {/* View tabs */}
      <div className="mb-5 flex gap-2">
        {VIEW_TABS.map((tab) => {
          const active = view === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setView(tab.id)}
              className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                active
                  ? "bg-accent text-white shadow-sm"
                  : "border border-gray-200 bg-white text-muted hover:text-ink"
              }`}
            >
              {tab.label}
              <span
                className={`ml-2 rounded-full px-1.5 text-xs ${
                  active ? "bg-white/25 text-white" : "bg-paper text-muted"
                }`}
              >
                {counts[tab.id]}
              </span>
            </button>
          );
        })}
      </div>

      {loading && <p className="text-muted">Loading…</p>}
      {!loading && filtered.length === 0 && (
        <div className="card p-8 text-center text-muted">
          <p>
            {words.length === 0
              ? "Your dictionary is empty."
              : "Nothing matches those filters."}
          </p>
          {words.length === 0 && (
            <p className="mt-1 text-sm">
              Open a post or a reading text, then click a word or select a
              phrase to save it here.
            </p>
          )}
        </div>
      )}

      <div className="grid gap-3">
        {filtered.map((w) => (
          <div
            key={w.id}
            className="card flex flex-col gap-3 p-5 md:flex-row md:items-start md:justify-between"
          >
            <div className="flex-1">
              <div className="mb-1 flex items-center gap-2">
                {w.is_phrase && (
                  <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700">
                    Phrase
                  </span>
                )}
                <SourceBadge entry={w} />
              </div>

              <div className="flex flex-wrap items-baseline gap-3">
                <span
                  lang="ko"
                  className={`font-ko font-semibold ${
                    w.is_phrase ? "text-xl" : "text-2xl"
                  }`}
                >
                  {w.korean_word}
                </span>
                {w.romanization && (
                  <span className="text-sm italic text-muted">
                    {w.romanization}
                  </span>
                )}
              </div>
              <p className="mt-1 text-ink">{w.translation}</p>

              {w.is_phrase && w.context_sentence && (
                <p
                  lang="ko"
                  className="font-ko mt-1 text-sm italic text-muted"
                >
                  “{w.context_sentence}”
                </p>
              )}
              {!w.is_phrase && w.example_sentence && (
                <p className="mt-1 text-sm text-muted">{w.example_sentence}</p>
              )}

              {editingId === w.id ? (
                <div className="mt-3">
                  <textarea
                    className="input min-h-[70px]"
                    value={draftNote}
                    onChange={(e) => setDraftNote(e.target.value)}
                    placeholder="Your personal note…"
                  />
                  <div className="mt-2 flex gap-2">
                    <button
                      className="btn-primary"
                      onClick={() => saveNote(w.id)}
                    >
                      Save note
                    </button>
                    <button
                      className="btn-ghost"
                      onClick={() => setEditingId(null)}
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <>
                  {w.personal_note && (
                    <p className="mt-3 rounded-lg bg-paper px-3 py-2 text-sm text-ink">
                      <span className="mr-2 text-xs uppercase tracking-wide text-muted">
                        Note
                      </span>
                      {w.personal_note}
                    </p>
                  )}
                  <button
                    className="mt-2 text-xs text-accent hover:underline"
                    onClick={() => startEdit(w)}
                  >
                    {w.personal_note ? "Edit note" : "Add a personal note"}
                  </button>
                </>
              )}
            </div>

            <div className="flex flex-col items-end gap-2">
              <span className="text-xs text-muted">
                saved {new Date(w.added_at).toLocaleDateString()}
              </span>
              <button
                className="btn-ghost text-accent-dark"
                onClick={() => handleDelete(w.id)}
              >
                Remove
              </button>
            </div>
          </div>
        ))}
      </div>
    </section>
  );
}

function SourceBadge({ entry }) {
  if (entry.source_post) {
    return (
      <Link
        to={`/posts/${entry.source_post.id}`}
        className="text-xs text-muted hover:text-accent"
      >
        from Post: <span className="italic">{entry.source_post.title}</span>
      </Link>
    );
  }
  if (entry.source_text) {
    return (
      <Link
        to={`/texts/${entry.source_text.id}`}
        className="text-xs text-muted hover:text-accent"
      >
        from Text: <span className="italic">{entry.source_text.title}</span>
      </Link>
    );
  }
  return <span className="text-xs text-muted">added manually</span>;
}
