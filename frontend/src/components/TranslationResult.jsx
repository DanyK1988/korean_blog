/**
 * Visual for a single translation payload returned by the API.
 *
 * Used in three contexts:
 *   1. Inside :class:`KoreanWord` tooltips → ``compact={true}``
 *   2. Inside phrase popovers              → ``compact={false}``
 *   3. Inside :class:`TextTranslationPanel` → ``compact={false}``
 *
 * Shows a small badge indicating whether the result came from the cache
 * ("cached") or was freshly generated ("ai") so learners trust what they
 * are seeing is real, not stale mock data.
 *
 * Props
 * -----
 * - ``result``   object  — translation API response (see service shape)
 * - ``compact``  bool    — word-tooltip mode (default ``false``)
 * - ``loading``  bool
 * - ``error``    string | null
 */
export default function TranslationResult({
  result,
  compact = false,
  loading = false,
  error = null,
}) {
  if (loading) {
    return (
      <div className="flex items-center gap-2 py-2 text-sm text-muted">
        <span className="inline-block h-3 w-3 animate-spin rounded-full border-2 border-gray-300 border-t-accent" />
        Translating…
      </div>
    );
  }

  if (error) {
    return (
      <p className="py-1 text-sm text-accent-dark" role="alert">
        {error}
      </p>
    );
  }

  if (!result) return null;

  const CacheBadge = () =>
    result.from_cache || result.cache_layer === "session" ? (
      <span className="ml-2 rounded-full bg-green-50 px-1.5 py-0.5 text-[10px] font-medium text-green-600">
        cached
      </span>
    ) : (
      <span className="ml-2 rounded-full bg-blue-50 px-1.5 py-0.5 text-[10px] font-medium text-blue-600">
        ai
      </span>
    );

  if (compact) {
    return (
      <div className="mt-2 space-y-1">
        <div className="flex flex-wrap items-baseline gap-1">
          <span className="text-sm font-semibold text-accent">
            {result.translation}
          </span>
          <CacheBadge />
        </div>
        {result.romanization && (
          <p className="text-xs italic text-muted">{result.romanization}</p>
        )}
        {result.part_of_speech && (
          <p className="text-xs text-muted">{result.part_of_speech}</p>
        )}
      </div>
    );
  }

  return (
    <div className="space-y-3 text-sm">
      <div className="flex flex-wrap items-start gap-2">
        <p className="text-base font-semibold leading-snug text-accent">
          {result.translation}
        </p>
        <CacheBadge />
      </div>

      {result.romanization && (
        <p className="text-xs italic text-muted">{result.romanization}</p>
      )}

      {result.part_of_speech && (
        <span className="inline-block rounded-full bg-gray-100 px-2 py-0.5 text-xs text-muted">
          {result.part_of_speech}
        </span>
      )}

      {result.formality_notes && (
        <div className="rounded-lg border border-amber-100 bg-amber-50 px-3 py-2">
          <p className="text-xs text-amber-800">{result.formality_notes}</p>
        </div>
      )}

      {result.grammar_notes && (
        <div className="rounded-lg border border-blue-100 bg-blue-50 px-3 py-2">
          <p className="text-xs text-blue-800">{result.grammar_notes}</p>
        </div>
      )}

      {result.example_sentences?.length > 0 && (
        <div className="space-y-2">
          <p className="text-xs font-medium uppercase tracking-wide text-muted">
            Examples
          </p>
          {result.example_sentences.map((ex, i) => (
            <div
              key={i}
              className="space-y-0.5 border-l-2 border-gray-200 pl-3"
            >
              <p lang="ko" className="font-ko text-sm text-ink">
                {ex.ko}
              </p>
              <p className="text-xs text-muted">{ex.en}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
