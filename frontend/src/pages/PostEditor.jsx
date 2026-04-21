import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { postsApi } from "../api/endpoints.js";

export default function PostEditor() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isEdit = Boolean(id);

  const [form, setForm] = useState({ title: "", body: "", published: false });
  const [loading, setLoading] = useState(isEdit);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");

  useEffect(() => {
    if (!isEdit) return;
    let cancelled = false;
    postsApi.get(id).then((post) => {
      if (cancelled) return;
      setForm({ title: post.title, body: post.body, published: post.published });
      setLoading(false);
    });
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  function update(key) {
    return (e) =>
      setForm((f) => ({
        ...f,
        [key]: e.target.type === "checkbox" ? e.target.checked : e.target.value,
      }));
  }

  async function submit(e) {
    e.preventDefault();
    setBusy(true);
    setError("");
    try {
      const saved = isEdit
        ? await postsApi.update(id, form)
        : await postsApi.create(form);
      navigate(`/posts/${saved.id}`);
    } catch (err) {
      setError(err.response?.data?.detail || "Could not save the post.");
    } finally {
      setBusy(false);
    }
  }

  if (loading) return <p className="text-muted">Loading…</p>;

  return (
    <section className="mx-auto max-w-3xl">
      <div className="card p-8">
        <h1 className="mb-6 text-2xl font-bold">
          {isEdit ? "Edit post" : "Write a new post"}
        </h1>
        <form onSubmit={submit} className="space-y-4">
          <div>
            <label className="mb-1 block text-sm font-medium">Title</label>
            <input className="input" value={form.title} onChange={update("title")} required />
          </div>
          <div>
            <label className="mb-1 block text-sm font-medium">
              Body (HTML or Markdown)
            </label>
            <textarea
              className="input min-h-[320px] font-mono text-sm"
              value={form.body}
              onChange={update("body")}
              placeholder="Write your post here. Korean words will automatically become clickable on the detail page."
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm">
            <input
              type="checkbox"
              checked={form.published}
              onChange={update("published")}
            />
            Publish immediately
          </label>
          {error && <p className="text-sm text-accent-dark">{error}</p>}
          <div className="flex justify-end gap-2">
            <button
              type="button"
              className="btn-ghost"
              onClick={() => navigate(-1)}
            >
              Cancel
            </button>
            <button className="btn-primary" disabled={busy}>
              {busy ? "Saving…" : isEdit ? "Save changes" : "Create post"}
            </button>
          </div>
        </form>
      </div>
    </section>
  );
}
