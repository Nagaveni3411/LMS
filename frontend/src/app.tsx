import { Link, Navigate, Route, Routes } from "react-router-dom";
import { ProtectedRoute } from "./components/protected-route";
import { useAuth } from "./lib/auth-context";
import { CourseDetailPage } from "./pages/course-detail-page";
import { CoursesPage } from "./pages/courses-page";
import { LearningPage } from "./pages/learning-page";
import { LoginPage } from "./pages/login-page";

function Header() {
  const { user, logout } = useAuth();
  return (
    <header className="topbar">
      <Link to="/courses" className="brand">
        LMS
      </Link>
      <nav className="row">
        {user ? (
          <>
            <span className="muted">
              {user.name} ({user.role})
            </span>
            <button onClick={logout}>Logout</button>
          </>
        ) : (
          <Link to="/login">Login</Link>
        )}
      </nav>
    </header>
  );
}

export default function App() {
  return (
    <>
      <Header />
      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route element={<ProtectedRoute />}>
          <Route path="/courses" element={<CoursesPage />} />
          <Route path="/courses/:courseId" element={<CourseDetailPage />} />
          <Route path="/courses/:courseId/learn" element={<LearningPage />} />
        </Route>
        <Route path="*" element={<Navigate to="/courses" replace />} />
      </Routes>
    </>
  );
}
