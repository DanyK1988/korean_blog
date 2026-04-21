import api from "./client.js";

export const authApi = {
  register: (payload) => api.post("/auth/register/", payload).then((r) => r.data),
  login: (payload) => api.post("/auth/login/", payload).then((r) => r.data),
  me: () => api.get("/auth/me/").then((r) => r.data),
};

export const postsApi = {
  list: (params = {}) => api.get("/posts/", { params }).then((r) => r.data),
  get: (id) => api.get(`/posts/${id}/`).then((r) => r.data),
  create: (payload) => api.post("/posts/", payload).then((r) => r.data),
  update: (id, payload) => api.patch(`/posts/${id}/`, payload).then((r) => r.data),
  remove: (id) => api.delete(`/posts/${id}/`).then((r) => r.data),
  togglePublish: (id) => api.post(`/posts/${id}/publish/`).then((r) => r.data),
};

export const wordsApi = {
  list: (params = {}) => api.get("/words/", { params }).then((r) => r.data),
  add: (payload) => api.post("/words/", payload).then((r) => r.data),
  updateNote: (id, personal_note) =>
    api.patch(`/words/${id}/`, { personal_note }).then((r) => r.data),
  remove: (id) => api.delete(`/words/${id}/`).then((r) => r.data),
  // SRS / flashcards
  due: () => api.get("/words/due/").then((r) => r.data),
  review: (id, quality) =>
    api.post(`/words/${id}/review/`, { quality }).then((r) => r.data),
  stats: () => api.get("/words/stats/").then((r) => r.data),
};
