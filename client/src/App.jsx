import { Navigate, Route, Routes } from "react-router-dom";
import BoardLayout from "@/components/board/board-layout";
import Providers from "@/components/providers/providers";
import { useAuth } from "@/contexts/auth-context";
import AcceptInvite from "@/pages/AcceptInvite";
import ForYou from "@/pages/ForYou";
import ForgotPassword from "@/pages/ForgotPassword";
import Login from "@/pages/Login";
import Projects from "@/pages/Projects";
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/forgot-password" element={<GuestRoute><ForgotPassword /></GuestRoute>} />
      <Route path="/login" element={<GuestRoute><Login /></GuestRoute>} />
      <Route path="/reset-password" element={<GuestRoute><ResetPassword /></GuestRoute>} />
      <Route path="/signup" element={<GuestRoute><Signup /></GuestRoute>} />
      <Route path="/verify-email" element={<VerifyEmail />} />
      <Route path="/invites/:token/accept" element={<ProtectedRoute><AcceptInvite /></ProtectedRoute>} />
      <Route path="/" element={<ProtectedRoute><Navigate to="/for-you" replace /></ProtectedRoute>} />
      <Route path="/dashboard" element={<ProtectedRoute><Navigate to="/for-you" replace /></ProtectedRoute>} />
      <Route path="/for-you" element={<ProtectedRoute><ForYou /></ProtectedRoute>} />
      <Route path="/recent" element={<ProtectedRoute><Recent /></ProtectedRoute>} />
      <Route path="/spaces" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/spaces/:projectId" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/spaces/:projectId/tasks/:taskId" element={<ProtectedRoute><TaskDetailPage /></ProtectedRoute>} />
      <Route path="/spaces/:projectId/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/projects/:projectId" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
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
