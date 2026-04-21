/**
 * Study-page API surface.
 *
 * Thin re-exports over the shared axios client + the existing
 * ``wordsApi`` object. Keeping them as named exports matches the naming
 * called out in the Study-page spec and makes imports read nicely:
 *
 *     import { getDueWords, submitReview, getStats } from "../api/words";
 */
import { wordsApi } from "./endpoints.js";

export const getDueWords = () => wordsApi.due();
export const submitReview = (id, quality) => wordsApi.review(id, quality);
export const getStats = () => wordsApi.stats();
