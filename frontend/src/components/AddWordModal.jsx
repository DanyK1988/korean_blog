import { useEffect, useRef, useState } from "react";
import { wordsApi } from "../api/endpoints.js";

/**
 * Modal dialog for manually adding a word or phrase to the personal
 * dictionary.
 *
 * The backend's ``AddWordSerializer`` already accepts ``source_type:
 * "manual"`` and de-duplicates on ``(user, korean_word)`` — if the user
 * enters something they've saved before, the existing row is returned
 * (HTTP 200) and surfaced to the caller via ``onAdded`` just like a new
 * entry.
 *
 * Props
 * -----
 * - ``onClose``  : close button / outside click / Escape
 * - ``onAdded``  : called with the ``UserWord`` payload on success
 */
export default function AddWordModal({ onClose, onAdded }) {
  const [korean, setKorean] = useState("");
  const [translation, setTranslation] = useState("");
  const [romanization, setRomanization] = useState("");
  const [example, setExample] = useState("");
  const [note, setNote] = useState("");
  const [isPhrase, setIsPhrase] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const dialogRef = useRef(null);
  const firstInputRef = useRef(null);

  // Close on Escape + focus the first input on mount.
  useEffect(() => {
    firstInputRef.current?.focus();
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, [onClose]);

  function handleBackdrop(e) {
    if (e.target === e.currentTarget) onClose?.();
  }

  async function handleSubmit(e) {
    e.preventDefault();
    if (!korean.trim()) {
      setError("Korean word or phrase is required.");
      return;
    }
    if (!translation.trim()) {
      setError("Translation is required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        korean_word: korean.trim(),
        translation: translation.trim(),
        romanization: romanization.trim(),
        example_sentence: example.trim(),
        personal_note: note.trim(),
        is_phrase: isPhrase,
        source_type: "manual",
      };
      const result = await wordsApi.add(payload);
      onAdded?.(result);
    } catch (err) {
      setError(
        err.response?.data?.detail ||
          "Could not save. Check that you're logged in and try again."
      );
      setSaving(false);
    }
  }

  return (
    <div
      onMouseDown={handleBackdrop}
      className="fixed inset-0 z-[1000] flex items-start justify-center overflow-y-auto bg-black/40 p-4 pt-[10vh] backdrop-blur-sm"
    >
      <div
        ref={dialogRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="add-word-title"
        className="w-full max-w-md rounded-2xl bg-white p-6 shadow-[0_20px_60px_rgba(0,0,0,0.18)] md:p-7"
      >
        <div className="mb-4 flex items-center justify-between">
          <h2 id="add-word-title" className="text-xl font-semibold text-ink">
            Add to your dictionary
          </h2>
          <button
            onClick={onClose}
            className="rounded-full p-1 text-muted hover:bg-paper hover:text-ink"
            aria-label="Close"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Korean word or phrase <span className="text-accent">*</span>
            </label>
            <input
              ref={firstInputRef}
              lang="ko"
              className="input font-ko"
              placeholder="e.g. 고양이 or 한국어를 배우고 있어요"
              value={korean}
              onChange={(e) => setKorean(e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Translation <span className="text-accent">*</span>
            </label>
            <input
              className="input"
              placeholder="e.g. cat / I am learning Korean"
              value={translation}
              onChange={(e) => setTranslation(e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Romanization (optional)
            </label>
            <input
              className="input"
              placeholder="e.g. goyangi"
              value={romanization}
              onChange={(e) => setRomanization(e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Example sentence (optional)
            </label>
            <input
              lang="ko"
              className="input font-ko"
              placeholder="e.g. 저는 고양이를 좋아해요."
              value={example}
              onChange={(e) => setExample(e.target.value)}
              disabled={saving}
            />
          </div>

          <div>
            <label className="mb-1 block text-xs font-medium text-muted">
              Personal note (optional)
            </label>
            <textarea
              className="input min-h-[70px]"
              placeholder="Mnemonics, context, where you heard it…"
              value={note}
              onChange={(e) => setNote(e.target.value)}
              disabled={saving}
            />
          </div>

          <label className="flex cursor-pointer items-center gap-2 pt-1 text-sm text-muted">
            <input
              type="checkbox"
              className="h-4 w-4 rounded border-gray-300 text-accent focus:ring-accent"
              checked={isPhrase}
              onChange={(e) => setIsPhrase(e.target.checked)}
              disabled={saving}
            />
            This is a phrase or full sentence
          </label>

          {error && (
            <p className="text-sm text-accent-dark" role="alert">
              {error}
            </p>
          )}

          <div className="flex justify-end gap-2 pt-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={onClose}
              disabled={saving}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="btn-primary"
              disabled={saving}
            >
              {saving ? "Saving…" : "Add to dictionary"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
