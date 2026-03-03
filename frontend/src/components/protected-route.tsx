import { Navigate, Outlet } from "react-router-dom";
import { useAuth } from "../lib/auth-context";

export function ProtectedRoute() {
  const { user, loading } = useAuth();

  if (loading) return <div className="centered">Loading session...</div>;
  if (!user) return <Navigate to="/login" replace />;
  return <Outlet />;
}
