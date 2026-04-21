import { Link, NavLink, useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext.jsx";
import { useStats } from "../context/StatsContext.jsx";

const linkCls = ({ isActive }) =>
  `px-3 py-2 rounded-lg text-sm font-medium transition inline-flex items-center ${
    isActive ? "text-accent bg-accent-soft" : "text-ink hover:bg-paper"
  }`;

export default function Navbar() {
  const { user, logout } = useAuth();
  const { stats } = useStats();
  const dueCount = stats?.due_today || 0;
  const navigate = useNavigate();

  function handleLogout() {
    logout();
    navigate("/");
  }

  return (
    <header className="sticky top-0 z-20 border-b border-gray-100 bg-canvas/90 backdrop-blur">
      <nav className="mx-auto flex max-w-5xl items-center justify-between px-4 py-3">
        <Link to="/" className="flex items-center gap-3">
          <img
            src="/img/logo.png"
            alt="Korean Wave · 한글 블로그"
            className="h-10 w-auto md:h-11"
          />
          <span className="sr-only">Korean Wave — 한글 블로그</span>
        </Link>

        <div className="flex items-center gap-1 md:gap-2">
          <NavLink to="/" end className={linkCls}>
            Blog
          </NavLink>
          <NavLink to="/texts" className={linkCls}>
            Texts
          </NavLink>
          <NavLink to="/dictionary" className={linkCls}>
            My Dictionary
          </NavLink>
          {user && (
            <NavLink to="/study" className={linkCls}>
              Study
              {dueCount > 0 && (
                <span className="ml-1.5 inline-flex h-5 min-w-[1.25rem] items-center justify-center rounded-full bg-red-500 px-1 text-xs font-bold text-white">
                  {dueCount}
                </span>
              )}
            </NavLink>
          )}
          {user ? (
            <>
              <NavLink to="/posts/new" className={linkCls}>
                Write
              </NavLink>
              <span className="hidden text-sm text-muted md:inline">
                {user.username}
              </span>
              <button onClick={handleLogout} className="btn-outline">
                Logout
              </button>
            </>
          ) : (
            <>
              <NavLink to="/login" className={linkCls}>
                Login
              </NavLink>
              <Link to="/register" className="btn-primary">
                Register
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
