import { Navigate, Route, Routes } from "react-router-dom";
import BoardLayout from "@/components/board/board-layout";
import Providers from "@/components/providers/providers";
import { useAuth } from "@/contexts/auth-context";
import Home from "@/pages/Home";
import ActivityFeeds from "@/pages/ActivityFeeds";
import AuditLogs from "@/pages/AuditLogs";
import ForgotPassword from "@/pages/ForgotPassword";
import Login from "@/pages/Login";
import Notifications from "@/pages/Notifications";
import Projects from "@/pages/Projects";
import ResetPassword from "@/pages/ResetPassword";
import SearchPage from "@/pages/SearchPage";
import Setting from "@/pages/Settings";
import Signup from "@/pages/Signup";
import Tasks from "@/pages/Tasks";
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
      <Route path="/" element={<ProtectedRoute><Home /></ProtectedRoute>} />
      <Route path="/activity-feeds" element={<ProtectedRoute><ActivityFeeds /></ProtectedRoute>} />
      <Route path="/audit-logs" element={<ProtectedRoute><AuditLogs /></ProtectedRoute>} />
      <Route path="/notifications" element={<ProtectedRoute><Notifications /></ProtectedRoute>} />
      <Route path="/projects" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/projects/:projectId" element={<ProtectedRoute><Projects /></ProtectedRoute>} />
      <Route path="/profile" element={<Navigate to="/settting" replace />} />
      <Route path="/search-page" element={<ProtectedRoute><SearchPage /></ProtectedRoute>} />
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
