import { useEffect, useRef, useState } from "react";
import { wordsApi } from "../api/endpoints.js";
import { useAuth } from "../context/AuthContext.jsx";
import { useTranslation } from "../hooks/useTranslation.js";
import TranslationResult from "./TranslationResult.jsx";

/**
 * A single Korean token rendered inside a post. Clicking it opens a popover
 * where the user can edit the translation + romanization and save the word
 * to their personal dictionary.
 *
 * Props:
 * - word:             the Korean token string
 * - sourceType:       "post" | "text" — which resource the word came from
 * - sourceId:         id of the containing Post or Text
 * - savedDict:        Map<koreanWord, { id }> of words already saved
 * - onSaved:          callback(word, savedWordId) after a successful save
 *
 * ``sourcePostId`` is still accepted as a legacy alias for ``sourceId`` when
 * ``sourceType === "post"`` so older call-sites keep working.
 */
export default function KoreanWord({
  word,
  sourceType = "post",
  sourceId,
  sourcePostId,
  savedDict,
  onSaved,
}) {
  const resolvedId = sourceId ?? sourcePostId ?? null;
  const { user } = useAuth();
  const saved = savedDict?.get(word);

  const [open, setOpen] = useState(false);
  const [translation, setTranslation] = useState("");
  const [romanization, setRomanization] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const ref = useRef(null);

  // AI translation state — mounted lazily when the user clicks "Translate
  // with AI" so we don't hit the server on every tooltip open.
  const [aiResult, setAiResult] = useState(null);
  const [aiTried, setAiTried] = useState(false);
  const {
    loading: aiLoading,
    error: aiError,
    translateWord: fetchAiTranslation,
  } = useTranslation();

  // Reset the AI state each time the tooltip is closed so the next open
  // starts fresh instead of showing stale UI from a previous session.
  useEffect(() => {
    if (!open) {
      setAiResult(null);
      setAiTried(false);
    }
  }, [open]);

  async function handleAiTranslate() {
    const result = await fetchAiTranslation(word);
    setAiTried(true);
    if (result) {
      setAiResult(result);
      if (!translation) setTranslation(result.translation || "");
      if (!romanization) setRomanization(result.romanization || "");
    }
  }

  useEffect(() => {
    if (!open) return;
    function onDoc(e) {
      if (ref.current && !ref.current.contains(e.target)) setOpen(false);
    }
    document.addEventListener("mousedown", onDoc);
    return () => document.removeEventListener("mousedown", onDoc);
  }, [open]);

  async function handleSave() {
    if (!user) {
      setError("Please log in to save words.");
      return;
    }
    if (!translation.trim()) {
      setError("Add a translation first.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const payload = {
        korean_word: word,
        translation: translation.trim(),
        romanization: romanization.trim(),
        is_phrase: false,
        source_type: sourceType,
      };
      if (sourceType === "text") payload.source_text_id = resolvedId;
      else payload.source_post_id = resolvedId;

      const result = await wordsApi.add(payload);
      onSaved?.(word, result);
      setOpen(false);
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          "Could not save the word. Please try again."
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <span ref={ref} className="relative inline-block">
      <span
        lang="ko"
        className={`korean-word font-ko ${saved ? "saved" : ""}`}
        onClick={() => setOpen((v) => !v)}
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            setOpen((v) => !v);
          }
        }}
      >
        {word}
      </span>

      {open && (
        <span
          className="absolute left-0 top-full z-30 mt-2 w-72 rounded-card bg-white p-4 text-left shadow-pop"
          onClick={(e) => e.stopPropagation()}
        >
          <div className="mb-2 flex items-center justify-between">
            <span className="font-ko text-lg font-semibold">{word}</span>
            {saved && (
              <span className="rounded-full bg-accent-soft px-2 py-0.5 text-xs font-medium text-accent-dark">
                ✓ In your dictionary
              </span>
            )}
          </div>

          {!saved && (
            <>
              {!aiTried ? (
                <button
                  onClick={handleAiTranslate}
                  disabled={aiLoading}
                  className="mb-3 flex w-full items-center justify-center gap-2 rounded-lg border border-gray-200 bg-gray-50 px-3 py-2 text-sm text-muted transition hover:border-accent/40 hover:text-accent disabled:opacity-60"
                  type="button"
                >
                  <svg
                    width="14"
                    height="14"
                    viewBox="0 0 16 16"
                    fill="none"
                    aria-hidden
                  >
                    <path
                      d="M8 1v3M8 12v3M1 8h3M12 8h3M3.5 3.5l2 2M10.5 10.5l2 2M3.5 12.5l2-2M10.5 5.5l2-2"
                      stroke="currentColor"
                      strokeWidth="1.5"
                      strokeLinecap="round"
                    />
                  </svg>
                  {aiLoading ? "Translating…" : "Translate with AI"}
                </button>
              ) : (
                <div className="mb-3">
                  <TranslationResult
                    result={aiResult}
                    loading={aiLoading}
                    error={aiError}
                    compact
                  />
                </div>
              )}

              <label className="mb-1 block text-xs font-medium text-muted">
                Translation
              </label>
              <input
                autoFocus
                className="input mb-2"
                value={translation}
                onChange={(e) => setTranslation(e.target.value)}
                placeholder="e.g. book"
                disabled={busy}
              />
              <label className="mb-1 block text-xs font-medium text-muted">
                Romanization (optional)
              </label>
              <input
                className="input mb-3"
                value={romanization}
                onChange={(e) => setRomanization(e.target.value)}
                placeholder="e.g. chaek"
                disabled={busy}
              />
              {error && (
                <p className="mb-2 text-xs text-accent-dark">{error}</p>
              )}
              <div className="flex justify-end gap-2">
                <button
                  className="btn-ghost"
                  onClick={() => setOpen(false)}
                  disabled={busy}
                >
                  Cancel
                </button>
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  disabled={busy}
                >
                  {busy ? "Saving…" : "Add to My Dictionary"}
                </button>
              </div>
            </>
          )}

          {saved && (
            <p className="text-xs text-muted">
              This word is already in your personal dictionary. Manage it on
              the{" "}
              <a
                href="/dictionary"
                className="text-accent hover:underline"
              >
                My Dictionary
              </a>{" "}
              page.
            </p>
          )}
        </span>
      )}
    </span>
  );
}
