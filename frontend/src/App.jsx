import { Route, Routes } from "react-router-dom";
import Navbar from "./components/Navbar.jsx";
import PrivateRoute from "./components/PrivateRoute.jsx";
import Home from "./pages/Home.jsx";
import PostDetail from "./pages/PostDetail.jsx";
import TextsPage from "./pages/TextsPage.jsx";
import TextDetailPage from "./pages/TextDetailPage.jsx";
import Dictionary from "./pages/Dictionary.jsx";
import Login from "./pages/Login.jsx";
import Register from "./pages/Register.jsx";
import PostEditor from "./pages/PostEditor.jsx";
import StudyPage from "./pages/StudyPage.jsx";
import NotFound from "./pages/NotFound.jsx";

export default function App() {
  return (
    <div className="min-h-full bg-paper">
      <Navbar />
      <main className="mx-auto max-w-5xl px-4 py-8">
        <Routes>
          <Route path="/" element={<Home />} />
          <Route path="/posts/:id" element={<PostDetail />} />
          <Route path="/texts" element={<TextsPage />} />
          <Route path="/texts/:id" element={<TextDetailPage />} />
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
          <Route
            path="/dictionary"
            element={
              <PrivateRoute>
                <Dictionary />
              </PrivateRoute>
            }
          />
          <Route
            path="/study"
            element={
              <PrivateRoute>
                <StudyPage />
              </PrivateRoute>
            }
          />
          <Route
            path="/posts/new"
            element={
              <PrivateRoute>
                <PostEditor />
              </PrivateRoute>
            }
          />
          <Route
            path="/posts/:id/edit"
            element={
              <PrivateRoute>
                <PostEditor />
              </PrivateRoute>
            }
          />
          <Route path="*" element={<NotFound />} />
        </Routes>
      </main>
      <footer className="mx-auto max-w-5xl px-4 py-10 text-center text-xs text-muted">
        한국어 블로그 · Learn Korean one word at a time
      </footer>
    </div>
  );
}
