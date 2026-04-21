/** API helpers for Korean reading-practice texts. */
import api from "./client.js";

export const getTexts = (params = {}) =>
  api.get("/texts/", { params }).then((r) => r.data);

export const getTextById = (id) =>
  api.get(`/texts/${id}/`).then((r) => r.data);

export const createText = (payload) =>
  api.post("/texts/", payload).then((r) => r.data);

export const updateText = (id, payload) =>
  api.patch(`/texts/${id}/`, payload).then((r) => r.data);

export const deleteText = (id) =>
  api.delete(`/texts/${id}/`).then((r) => r.data);
