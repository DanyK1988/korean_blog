import { useState } from "react";
import { useTranslation } from "../hooks/useTranslation.js";
import TranslationResult from "./TranslationResult.jsx";

/**
 * Collapsible "Translate entire text with AI" panel used at the bottom
 * of :file:`TextDetailPage` and :file:`PostDetail`.
 *
 * Behaviour
 * ---------
 * - First click: fires the API call, shows spinner, expands the panel
 *   when the result arrives.
 * - Subsequent clicks: toggle panel visibility without re-calling the
 *   API (result is cached in both the hook's session ``Map`` and,
 *   server-side, in the persistent cache).
 *
 * Props
 * -----
 * - ``koreanText``  full body string (HTML is allowed — LLM handles it)
 * - ``textId``      id of the Text or Post (passed to the server for logs)
 * - ``sourceType``  ``"text" | "post"`` — currently informational only
 */
export default function TextTranslationPanel({
  koreanText,
  textId,
  sourceType = "text",
}) {
  const [open, setOpen] = useState(false);
  const [result, setResult] = useState(null);
  const [fetched, setFetched] = useState(false);
  const { loading, error, translateFullText } = useTranslation();

  async function handleToggle() {
    if (fetched) {
      setOpen((v) => !v);
      return;
    }
    const res = await translateFullText(koreanText, textId);
    if (res) {
      setResult(res);
      setFetched(true);
      setOpen(true);
    }
  }

  const buttonLabel = loading
    ? "Translating…"
    : fetched
    ? open
      ? "Hide AI translation"
      : "Show AI translation"
    : "Translate entire text with AI";

  return (
    <div
      className="mt-8 border-t border-gray-100 pt-6"
      data-source-type={sourceType}
    >
      <button
        onClick={handleToggle}
        disabled={loading || !koreanText}
        className="flex items-center gap-2.5 rounded-xl border border-gray-200 bg-white px-5 py-2.5 text-sm font-medium text-muted shadow-sm transition-all duration-200 hover:border-accent hover:text-accent disabled:cursor-not-allowed disabled:opacity-50"
      >
        {loading ? (
          <>
            <span className="inline-block h-4 w-4 animate-spin rounded-full border-2 border-gray-200 border-t-accent" />
            Translating…
          </>
        ) : (
          <>
            <SparkleIcon />
            {buttonLabel}
          </>
        )}
      </button>

      {error && (
        <p className="mt-3 text-sm text-accent-dark" role="alert">
          {error}
        </p>
      )}

      {open && result && (
        <div className="mt-4 space-y-4 rounded-xl border border-gray-100 bg-gray-50 p-5">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium uppercase tracking-wide text-muted">
              AI Translation
            </p>
            {result.from_cache && (
              <span className="rounded-full border border-green-100 bg-green-50 px-2 py-0.5 text-xs text-green-600">
                from cache — instant
              </span>
            )}
          </div>

          <div className="prose prose-sm max-w-none whitespace-pre-wrap leading-relaxed text-ink">
            {result.translation}
          </div>

          {result.grammar_notes && (
            <div className="rounded-lg border border-blue-100 bg-blue-50 px-4 py-3">
              <p className="mb-1 text-xs font-medium text-blue-600">
                Learner notes
              </p>
              <p className="text-sm text-blue-800">{result.grammar_notes}</p>
            </div>
          )}

          <button
            onClick={() => setOpen(false)}
            className="text-xs text-muted hover:text-ink"
          >
            Hide translation
          </button>
        </div>
      )}
    </div>
  );
}

function SparkleIcon({ size = 16 }) {
  return (
    <svg
      width={size}
      height={size}
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
  );
}
