/** API helpers for the AI translation service. */
import api from "./client.js";

/** Translate a single Korean word (cache-first). */
export const translateWord = (text) =>
  api.post("/translate/word/", { text }).then((r) => r.data);

/** Translate a phrase or full sentence. */
export const translatePhrase = (text) =>
  api.post("/translate/phrase/", { text }).then((r) => r.data);

/** Translate a full Korean text passage.
 *
 * The second arg is an optional source id, used purely for logging /
 * analytics on the server.
 */
export const translateFullText = (text, textId = null) =>
  api.post("/translate/text/", { text, text_id: textId }).then((r) => r.data);

/** Cache statistics (words/phrases/texts counts + hit rate). */
export const getCacheStats = () =>
  api.get("/translate/stats/").then((r) => r.data);
