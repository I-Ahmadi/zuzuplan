import { lazy } from "react";
import { Navigate, Route, Routes } from "react-router-dom";
import { GuestRoute, LandingRedirect, ProtectedRoute } from "@/config/route-guards";

const AcceptInvite = lazy(() => import("@/features/invites/pages/accept-invite-page"));
const ForgotPassword = lazy(() => import("@/features/auth/pages/forgot-password-page"));
const Home = lazy(() => import("@/features/dashboard/pages/home-page"));
const Login = lazy(() => import("@/features/auth/pages/login-page"));
const Notifications = lazy(() => import("@/features/static/pages/notifications-page"));
const Activity = lazy(() => import("@/features/activity/pages/activity-page"));
const Analytics = lazy(() => import("@/features/analytics/pages/analytics-page"));
const ReleaseNotes = lazy(() => import("@/features/static/pages/release-notes-page"));
const ResetPassword = lazy(() => import("@/features/auth/pages/reset-password-page"));
const Settings = lazy(() => import("@/features/settings/pages/settings-page"));
const Signup = lazy(() => import("@/features/auth/pages/signup-page"));
const People = lazy(() => import("@/features/people/pages/people-page"));
const Projects = lazy(() => import("@/features/projects/pages/projects-page"));
const Tasks = lazy(() => import("@/features/tasks/pages/tasks-page"));
const TaskDetailPage = lazy(() => import("@/features/tasks/pages/task-detail-page"));
const VerifyEmail = lazy(() => import("@/features/auth/pages/verify-email-page"));

export default function AppRoutes() {
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
      <Route path="/settings" element={<ProtectedRoute><Settings /></ProtectedRoute>} />
      <Route path="/tasks" element={<ProtectedRoute><Tasks /></ProtectedRoute>} />
      <Route path="/people" element={<ProtectedRoute><People /></ProtectedRoute>} />
      <Route path="/settting" element={<ProtectedRoute><Navigate to="/settings" replace /></ProtectedRoute>} />
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
