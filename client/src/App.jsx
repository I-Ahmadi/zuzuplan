import { Navigate, Route, Routes } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import BoardLayout from "@/components/board/board-layout";
import Providers from "@/components/providers/providers";
import { useAuth } from "@/contexts/auth-context";
import { getUserPreferences } from "@/lib/user-api";
import AcceptInvite from "@/pages/AcceptInvite";
import ComingSoon from "@/pages/ComingSoon";
import ForYou from "@/pages/ForYou";
import ForgotPassword from "@/pages/ForgotPassword";
import Login from "@/pages/Login";
import Projects from "@/pages/Projects";
import ProjectSettings from "@/pages/ProjectSettings";
import Recent from "@/pages/Recent";
import ResetPassword from "@/pages/ResetPassword";
import Setting from "@/pages/Settings";
import Signup from "@/pages/Signup";
import Tasks, { TaskDetailPage } from "@/pages/Tasks";
import TeamMembers from "@/pages/TeamMembers";
import VerifyEmail from "@/pages/VerifyEmail";

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
  const preferencesQuery = useQuery({
    queryKey: ["user-preferences"],
    queryFn: getUserPreferences,
  });
  const defaultView = preferencesQuery.data?.data?.defaultView || "for-you";
  const destination = {
    "for-you": "/for-you",
    dashboard: "/for-you",
    spaces: "/spaces",
    board: "/tasks",
    recent: "/recent",
  }[defaultView] || "/for-you";

  if (preferencesQuery.isLoading) {
    return <FullScreenMessage message="Loading your workspace..." />;
  }

  return <Navigate to={destination} replace />;
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
      <Route path="/recent" element={<ProtectedRoute><Recent /></ProtectedRoute>} />
      <Route path="/my-tasks" element={<ProtectedRoute><ComingSoon title="My Tasks" description="A personal workload view for tasks assigned to you across spaces." /></ProtectedRoute>} />
      <Route path="/inbox" element={<ProtectedRoute><ComingSoon title="Inbox" description="A focused place for mentions, assignments, comments, and notifications." /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><ComingSoon title="Notifications" description="A focused notification center for mentions, assignments, reminders, and updates." /></ProtectedRoute>} />
      <Route path="/release-notes" element={<ProtectedRoute><ComingSoon title="Release Notes" description="Product updates, improvements, fixes, and rollout notes will appear here." /></ProtectedRoute>} />
      <Route path="/knowledge" element={<ProtectedRoute><ComingSoon title="Knowledge" description="A global knowledge hub for docs, notes, decisions, and team references." /></ProtectedRoute>} />
      <Route path="/roadmaps" element={<ProtectedRoute><ComingSoon title="Roadmaps" description="Long-term planning timelines across spaces, goals, and major initiatives." /></ProtectedRoute>} />
      <Route path="/goals" element={<ProtectedRoute><ComingSoon title="Goals" description="Track objectives and connect them to spaces, teams, and delivery progress." /></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><ComingSoon title="Reports" description="Review progress, workload, overdue work, velocity, and delivery health." /></ProtectedRoute>} />
      <Route path="/audit-log" element={<ProtectedRoute><ComingSoon title="Audit Log" description="Review important workspace events, access changes, and administrative activity." /></ProtectedRoute>} />
      <Route path="/spaces" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/spaces/:projectId" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/spaces/:projectId/settings" element={<ProtectedRoute><ProjectSettings /></ProtectedRoute>} />
      <Route path="/spaces/:projectId/tasks/:taskId" element={<ProtectedRoute><TaskDetailPage /></ProtectedRoute>} />
      <Route path="/spaces/:projectId/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/projects/:projectId" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/projects/:projectId/settings" element={<ProtectedRoute><ProjectSettings /></ProtectedRoute>} />
      <Route path="/projects/:projectId/tasks/:taskId" element={<ProtectedRoute><TaskDetailPage /></ProtectedRoute>} />
      <Route path="/projects/:projectId/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/profile" element={<Navigate to="/settting" replace />} />
      <Route path="/settting" element={<ProtectedRoute><Setting /></ProtectedRoute>} />
      <Route path="/settings" element={<Navigate to="/settting" replace />} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
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
        <AppRoutes />
      </BoardLayout>
    </Providers>
  );
}
