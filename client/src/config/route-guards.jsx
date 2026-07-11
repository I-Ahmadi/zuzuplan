import { Navigate, useLocation } from "react-router-dom";
import { useAuth } from "@/features/auth/context/auth-context";
import { useApiResource } from "@/services/api-hooks";
import { getUserPreferences } from "@/features/settings/services/user-service";
import { FullPageLoader } from "@/components/ui/loading";

export function FullScreenMessage({ message }) {
  return <FullPageLoader message={message} />;
}

export function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullScreenMessage message="Checking your session..." />;
  }

  if (!isAuthenticated) {
    const redirect = `${location.pathname}${location.search}${location.hash}`;
    return <Navigate to={`/login?redirect=${encodeURIComponent(redirect)}`} replace />;
  }

  return children;
}

export function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <FullScreenMessage message="Loading..." />;
  }

  if (isAuthenticated) {
    const params = new URLSearchParams(location.search);
    const redirect = safeInternalRedirect(params.get("redirect"));
    return <Navigate to={redirect || "/"} replace />;
  }

  return children;
}

export function LandingRedirect() {
  const preferencesQuery = useApiResource(() => getUserPreferences("default"), []);
  const defaultView = preferencesQuery.data?.data?.defaultView || "home";
  const destination = {
    home: "/home",
    projects: "/projects",
    tasks: "/tasks",
    people: "/people",
    analytics: "/analytics",
    activity: "/activity",
  }[defaultView] || "/home";

  if (preferencesQuery.isLoading) {
    return <FullScreenMessage message="Loading your workspace..." />;
  }

  return <Navigate to={destination} replace />;
}

export function safeInternalRedirect(value) {
  if (!value || typeof value !== "string") return "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}
