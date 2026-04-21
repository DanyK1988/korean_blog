import { Link } from "react-router-dom";

export default function NotFound() {
  return (
    <div className="mx-auto max-w-md py-20 text-center">
      <p className="font-ko text-5xl font-bold text-accent">404</p>
      <h1 className="mt-2 text-xl font-semibold">Page not found</h1>
      <p className="mt-1 text-muted">
        페이지를 찾을 수 없습니다 — the page you're looking for doesn't exist.
      </p>
      <Link to="/" className="btn-primary mt-6">
        ← Back to blog
      </Link>
    </div>
  );
}
