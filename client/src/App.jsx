import { lazy, Suspense } from "react";
import { Navigate, Route, Routes, useParams } from "react-router-dom";
import BoardLayout from "@/components/board/board-layout";
import Providers from "@/components/providers/providers";
import { useAuth } from "@/contexts/auth-context";
import { useApiResource } from "@/lib/api-hooks";
import { getUserPreferences } from "@/lib/user-api";

const AcceptInvite = lazy(() => import("@/pages/AcceptInvite"));
const Activity = lazy(() => import("@/pages/Activity"));
const ForYou = lazy(() => import("@/pages/ForYou"));
const ForgotPassword = lazy(() => import("@/pages/ForgotPassword"));
const Login = lazy(() => import("@/pages/Login"));
const Projects = lazy(() => import("@/pages/Projects"));
const Reports = lazy(() => import("@/pages/Reports"));
const ResetPassword = lazy(() => import("@/pages/ResetPassword"));
const Setting = lazy(() => import("@/pages/Settings"));
const Signup = lazy(() => import("@/pages/Signup"));
const Tasks = lazy(() => import("@/pages/Tasks"));
const TaskDetailPage = lazy(() => import("@/pages/Tasks").then((module) => ({ default: module.TaskDetailPage })));
const TeamMembers = lazy(() => import("@/pages/TeamMembers"));
const VerifyEmail = lazy(() => import("@/pages/VerifyEmail"));

function FullScreenMessage({ message }) {
  return (
    <div className="flex min-h-screen items-center justify-center bg-background px-6">
      <p className="text-sm text-muted-foreground">{message}</p>
    </div>
  );
}

function ProtectedRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullScreenMessage message="Checking your session..." />;
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  return children;
}

function GuestRoute({ children }) {
  const { isAuthenticated, loading } = useAuth();

  if (loading) {
    return <FullScreenMessage message="Loading..." />;
  }

  if (isAuthenticated) {
    return <Navigate to="/" replace />;
  }

  return children;
}

function LandingRedirect() {
  const preferencesQuery = useApiResource(() => getUserPreferences("default"), []);
  const defaultView = preferencesQuery.data?.data?.defaultView || "for-you";
  const destination = {
    "for-you": "/for-you",
    dashboard: "/for-you",
    spaces: "/spaces",
    board: "/issues",
    issues: "/issues",
    recent: "/for-you",
  }[defaultView] || "/for-you";

  if (preferencesQuery.isLoading) {
    return <FullScreenMessage message="Loading your workspace..." />;
  }

  return <Navigate to={destination} replace />;
}

function ProjectRedirect({ suffix = "" }) {
  const { projectId } = useParams();
  return <Navigate to={`/spaces/${projectId}${suffix}`} replace />;
}

function ProjectTaskRedirect() {
  const { projectId, taskId } = useParams();
  return <Navigate to={`/spaces/${projectId}/issues/${taskId}`} replace />;
}

function AppRoutes() {
  return (
    <Routes>
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/invites/:token/accept" element={<ProtectedRoute><AcceptInvite /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><LandingRedirect /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><LandingRedirect /></ProtectedRoute>} />
      <Route path="/for-you" element={<ProtectedRoute><ForYou /></ProtectedRoute>} />
      <Route path="/recent" element={<Navigate to="/for-you" replace />} />
      <Route path="/activity" element={<ProtectedRoute><Activity /></ProtectedRoute>} />
      <Route path="/pull-requests" element={<Navigate to="/activity" replace />} />
      <Route path="/deployments" element={<Navigate to="/activity" replace />} />
      <Route path="/roadmaps" element={<Navigate to="/spaces" replace />} />
      <Route path="/goals" element={<Navigate to="/reports" replace />} />
      <Route path="/reports" element={<ProtectedRoute><Reports /></ProtectedRoute>} />
      <Route path="/spaces" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/spaces/:projectId" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/spaces/:projectId/issues/:taskId" element={<ProtectedRoute><TaskDetailPage /></ProtectedRoute>} />
      <Route path="/spaces/:projectId/issues" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/spaces/:projectId/tasks/:taskId" element={<ProtectedRoute><ProjectTaskRedirect /></ProtectedRoute>} />
      <Route path="/spaces/:projectId/tasks" element={<ProtectedRoute><ProjectRedirect suffix="/issues" /></ProtectedRoute>} />
      <Route path="/projects" element={<Navigate to="/spaces" replace />} />
      <Route path="/projects/:projectId" element={<ProtectedRoute><ProjectRedirect /></ProtectedRoute>} />
      <Route path="/projects/:projectId/issues/:taskId" element={<ProtectedRoute><ProjectTaskRedirect /></ProtectedRoute>} />
      <Route path="/projects/:projectId/issues" element={<ProtectedRoute><ProjectRedirect suffix="/issues" /></ProtectedRoute>} />
      <Route path="/projects/:projectId/tasks/:taskId" element={<ProtectedRoute><ProjectTaskRedirect /></ProtectedRoute>} />
      <Route path="/projects/:projectId/tasks" element={<ProtectedRoute><ProjectRedirect suffix="/issues" /></ProtectedRoute>} />
      <Route path="/profile" element={<Navigate to="/settting" replace />} />
      <Route path="/settting" element={<ProtectedRoute><Setting /></ProtectedRoute>} />
      <Route path="/settings" element={<Navigate to="/settting" replace />} />
      <Route path="/issues" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/tasks" element={<Navigate to="/issues" replace />} />
      <Route path="/team" element={<ProtectedRoute><TeamMembers /></ProtectedRoute>} />
      <Route path="/team-members" element={<ProtectedRoute><TeamMembers /></ProtectedRoute>} />
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
