import { useCallback, useState } from "react";
import {
  translateFullText as apiTranslateFullText,
  translatePhrase as apiTranslatePhrase,
  translateWord as apiTranslateWord,
} from "../api/translation.js";

/**
 * Unified translation interface.
 *
 * Caching strategy
 * ----------------
 * - Server side:  two-layer cache (locmem + SQLite ``TranslationCache``).
 * - Client side:  this hook also keeps a per-mount ``Map`` so repeatedly
 *   inspecting the same word inside one page session is zero-latency and
 *   does not even hit the server.  The ``cache_layer`` is tagged as
 *   ``"session"`` in the returned payload so UI components can surface
 *   it differently from server-side hits if desired.
 *
 * Loading / error state is shared across all three translation kinds —
 * which is fine in practice because the three calls are mutually
 * exclusive in any given component.
 */
export function useTranslation() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  // One ``Map`` per mount. Keyed by normalized input so that e.g. "고양이"
  // and " 고양이 " don't both round-trip to the server.
  const [sessionCache] = useState(() => new Map());

  const run = useCallback(
    async (text, apiFn) => {
      const key = (text || "").trim().toLowerCase();
      if (!key) return null;

      const cached = sessionCache.get(key);
      if (cached) return { ...cached, cache_layer: "session" };

      setLoading(true);
      setError(null);
      try {
        const result = await apiFn(text);
        sessionCache.set(key, result);
        return result;
      } catch (err) {
        const msg =
          err.response?.data?.error ||
          err.message ||
          "Translation failed";
        setError(msg);
        return null;
      } finally {
        setLoading(false);
      }
    },
    [sessionCache]
  );

  return {
    loading,
    error,
    translateWord: useCallback(
      (text) => run(text, apiTranslateWord),
      [run]
    ),
    translatePhrase: useCallback(
      (text) => run(text, apiTranslatePhrase),
      [run]
    ),
    translateFullText: useCallback(
      (text, textId) => run(text, (t) => apiTranslateFullText(t, textId)),
      [run]
    ),
  };
}
