import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useLocation } from "react-router-dom";
import BoardLayout from "@/components/board/board-layout";
import Providers from "@/components/providers/providers";
import { FullPageLoader } from "@/components/ui/loading";
import { useAuth } from "@/contexts/auth-context";
import { useApiResource } from "@/lib/api-hooks";
import { getUserPreferences } from "@/lib/user-api";

const AcceptInvite = lazy(() => import("@/pages/AcceptInvite"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const Home = lazy(() => import("@/pages/Home"));
const Login = lazy(() => import("@/pages/Login"));
const Notifications = lazy(() => import("@/pages/Notifications"));
const Activity = lazy(() => import("@/pages/Activity"));
const Analytics = lazy(() => import("@/pages/Analytics"));
const ReleaseNotes = lazy(() => import("@/pages/ReleaseNotes"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Setting = lazy(() => import("@/pages/Settings"));
const Signup = lazy(() => import("@/pages/Signup"));
const People = lazy(() => import("@/pages/People"));
const Projects = lazy(() => import("@/pages/Projects"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const TaskDetailPage = lazy(() => import("@/pages/Tasks").then((module) => ({ default: module.TaskDetailPage })));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));

function FullScreenMessage({ message }) {
  return <FullPageLoader message={message} />;
}

function ProtectedRoute({ children }) {
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

function GuestRoute({ children }) {
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

function LandingRedirect() {
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

function safeInternalRedirect(value) {
  if (!value || typeof value !== "string") return "";
  if (!value.startsWith("/") || value.startsWith("//")) return "";
  return value;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/invites/:token/accept" element={<AcceptInvite />} />
      <Route path="/" element={<ProtectedRoute><LandingRedirect /></ProtectedRoute>} />
      <Route path="/home" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/release-notes" element={<ProtectedRoute><ReleaseNotes /></ProtectedRoute>} />
      <Route path="/analytics" element={<ProtectedRoute><Analytics /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/projects/:projectId" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/projects/:projectId/tasks/:taskId" element={<ProtectedRoute><TaskDetailPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/profile" element={<Navigate to="/settings" replace />} />
      <Route path="/settings" element={<ProtectedRoute><Setting /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/people" element={<ProtectedRoute><People /></ProtectedRoute>} />

      <Route path="/settting" element={<ProtectedRoute><Navigate to="/settings" replace /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <Providers>
      <BoardLayout>
        <Suspense fallback={<FullScreenMessage message="Loading..." />}>
          <AppRoutes />
        </Suspense>
      </BoardLayout>
    </Providers>
  );
}
