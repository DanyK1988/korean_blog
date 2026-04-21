import { useEffect, useRef, useState } from "react";
import { wordsApi } from "../api/endpoints.js";
import { useTranslation } from "../hooks/useTranslation.js";

/**
 * Floating save-phrase popover anchored to a text selection range.
 *
 * Props
 * -----
 * - ``phrase``          : the selected Korean text (already trimmed)
 * - ``contextSentence`` : surrounding sentence extracted from the body
 * - ``position``        : ``{ x, y }`` in viewport coordinates (selection end)
 * - ``sourceType``      : ``"post"`` | ``"text"``
 * - ``sourceId``        : id of the containing Post / Text
 * - ``onSave``          : called with the saved ``UserWord`` on success
 * - ``onClose``         : called when the popover dismisses itself
 */
const POPOVER_WIDTH = 320;
const POPOVER_OFFSET = 10;

export default function PhraseSavePopover({
  phrase,
  contextSentence,
  position,
  sourceType,
  sourceId,
  onSave,
  onClose,
}) {
  const [translation, setTranslation] = useState("");
  const [romanization, setRomanization] = useState("");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState("");
  const [autoFilled, setAutoFilled] = useState(false);
  const rootRef = useRef(null);

  const {
    loading: aiLoading,
    translatePhrase: fetchAiTranslation,
  } = useTranslation();

  async function handleAutoTranslate() {
    const result = await fetchAiTranslation(phrase);
    if (result?.translation) {
      setTranslation(result.translation);
      if (result.romanization) setRomanization(result.romanization);
      setAutoFilled(true);
    }
  }

  // Dismiss on outside click or Escape
  useEffect(() => {
    function onDoc(e) {
      if (rootRef.current && !rootRef.current.contains(e.target)) onClose?.();
    }
    function onKey(e) {
      if (e.key === "Escape") onClose?.();
    }
    document.addEventListener("mousedown", onDoc);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      document.removeEventListener("keydown", onKey);
    };
  }, [onClose]);

  async function handleSave() {
    if (!translation.trim()) {
      setError("Add a translation first.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      const payload = {
        korean_word: phrase,
        translation: translation.trim(),
        romanization: romanization.trim(),
        context_sentence: contextSentence || "",
        is_phrase: true,
        source_type: sourceType,
      };
      if (sourceType === "text") payload.source_text_id = sourceId;
      else if (sourceType === "post") payload.source_post_id = sourceId;

      const result = await wordsApi.add(payload);
      setSaved(true);
      onSave?.(result);
      setTimeout(() => onClose?.(), 850);
    } catch (e) {
      setError(
        e.response?.data?.detail ||
          "Could not save the phrase. Please try again."
      );
      setSaving(false);
    }
  }

  // --- Positioning -------------------------------------------------------
  const viewportH = typeof window !== "undefined" ? window.innerHeight : 800;
  const viewportW = typeof window !== "undefined" ? window.innerWidth : 1200;
  const placeAbove = position.y > viewportH - 260;
  const clampedX = Math.max(
    12,
    Math.min(position.x - POPOVER_WIDTH / 2, viewportW - POPOVER_WIDTH - 12)
  );
  const top = placeAbove
    ? Math.max(12, position.y - POPOVER_OFFSET - 260)
    : position.y + POPOVER_OFFSET;

  return (
    <div
      ref={rootRef}
      style={{
        position: "fixed",
        left: clampedX,
        top,
        width: POPOVER_WIDTH,
        zIndex: 1000,
      }}
      onMouseDown={(e) => e.stopPropagation()}
      className="rounded-xl bg-white p-4 shadow-[0_8px_32px_rgba(0,0,0,0.12)] ring-1 ring-gray-100"
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <span className="rounded-full bg-purple-100 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-purple-700">
          Phrase
        </span>
        {saved && (
          <span className="text-xs font-medium text-green-600">✓ Saved!</span>
        )}
      </div>

      <p lang="ko" className="font-ko text-lg font-semibold leading-snug">
        {phrase}
      </p>
      {contextSentence && (
        <p
          lang="ko"
          className="font-ko mt-1 text-xs italic text-muted line-clamp-2"
        >
          {contextSentence}
        </p>
      )}

      <div className="mt-3 mb-1 flex items-center justify-between">
        <label className="text-xs font-medium text-muted">Translation</label>
        <button
          type="button"
          onClick={handleAutoTranslate}
          disabled={aiLoading || autoFilled || saving || saved}
          className="flex items-center gap-1 text-xs text-accent hover:underline disabled:opacity-40"
        >
          <svg
            width="11"
            height="11"
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
          {aiLoading
            ? "Translating…"
            : autoFilled
            ? "✓ Auto-filled"
            : "Auto-translate"}
        </button>
      </div>
      <input
        autoFocus
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        placeholder="e.g. I am learning Korean"
        value={translation}
        onChange={(e) => {
          setTranslation(e.target.value);
          setAutoFilled(false);
        }}
        disabled={saving || saved}
      />

      <label className="mt-2 mb-1 block text-xs font-medium text-muted">
        Romanization (optional)
      </label>
      <input
        className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:border-accent focus:outline-none focus:ring-2 focus:ring-accent/20"
        placeholder="e.g. hangug-eo-reul bae-ugo isseoyo"
        value={romanization}
        onChange={(e) => setRomanization(e.target.value)}
        disabled={saving || saved}
      />

      {error && <p className="mt-2 text-xs text-accent-dark">{error}</p>}

      <div className="mt-3 flex justify-end gap-2">
        <button
          className="rounded-lg px-3 py-1.5 text-sm text-muted hover:bg-paper"
          onClick={onClose}
          disabled={saving}
        >
          Cancel
        </button>
        <button
          className="rounded-lg bg-accent px-3 py-1.5 text-sm font-medium text-white hover:bg-accent-dark disabled:opacity-60"
          onClick={handleSave}
          disabled={saving || saved}
        >
          {saving ? "Saving…" : saved ? "Saved" : "Save to Dictionary"}
        </button>
      </div>
    </div>
  );
}
