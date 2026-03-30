import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "../lib/AuthContext";
import Skeleton from "./Skeleton";

export default function ProtectedRoute({ children }) {
  const { user, loading } = useAuth();
  const location = useLocation();

  if (loading) return <Skeleton.Card />;
  if (!user) return <Navigate to={`/login?redirect=${encodeURIComponent(location.pathname)}`} replace />;
  return children;
}
