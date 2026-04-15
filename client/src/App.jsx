import { Navigate, Route, Routes } from "react-router-dom";
import BoardLayout from "@/components/board/board-layout";
import Providers from "@/components/providers/providers";
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

function AppRoutes() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />
      <Route path="/activity-feeds" element={<ActivityFeeds />} />
      <Route path="/audit-logs" element={<AuditLogs />} />
      <Route path="/forgot-password" element={<ForgotPassword />} />
      <Route path="/login" element={<Login />} />
      <Route path="/notifications" element={<Notifications />} />
      <Route path="/projects" element={<Projects />} />
      <Route path="/projects/:projectId" element={<Projects />} />
      <Route path="/profile" element={<Navigate to="/settting" replace />} />
      <Route path="/reset-password" element={<ResetPassword />} />
      <Route path="/search-page" element={<SearchPage />} />
      <Route path="/settting" element={<Setting />} />
      <Route path="/settings" element={<Navigate to="/settting" replace />} />
      <Route path="/signup" element={<Signup />} />
      <Route path="/tasks" element={<Tasks />} />
      <Route path="/team" element={<TeamMembers />} />
      <Route path="/team-members" element={<TeamMembers />} />
      <Route path="/verify-email" element={<VerifyEmail />} />
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
