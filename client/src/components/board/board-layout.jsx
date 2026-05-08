import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/board/header";
import { Sidebar } from "@/components/board/sidebar";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";

const SIDEBAR_WIDTH_EXPANDED = 280;
const SIDEBAR_WIDTH_COLLAPSED = 56;
const AUTH_PATHS = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"];
const RECENT_KEY = "zuzuplan.recentNavigation";

function recentLabel(pathname) {
  if (pathname === "/for-you" || pathname === "/") return "For You";
  if (pathname === "/recent") return "Recent";
  if (pathname === "/spaces" || pathname === "/projects") return "Spaces";
  if (pathname === "/tasks" || /\/tasks/.test(pathname)) return "Board";
  if (pathname === "/team" || pathname === "/team-members") return "Teams";
  if (pathname === "/settting" || pathname === "/settings") return "Setting";
  return pathname;
}

function BoardLayoutInner({ children }) {
  const { pathname } = useLocation();
  const { collapsed } = useSidebar();
  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    if (isAuthPage) return;
    const item = { path: pathname, label: recentLabel(pathname), viewedAt: new Date().toISOString() };
    let current = [];
    try {
      current = JSON.parse(localStorage.getItem(RECENT_KEY) || "[]");
    } catch {
      current = [];
    }
    const next = [item, ...current.filter((entry) => entry.path !== pathname)].slice(0, 12);
    localStorage.setItem(RECENT_KEY, JSON.stringify(next));
  }, [isAuthPage, pathname]);

  if (isAuthPage) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="flex min-h-screen bg-background">
      <Sidebar />
      <main className="flex-1 min-h-screen transition-[margin-left] duration-300 ease-in-out" style={{ marginLeft: sidebarWidth }}>
        <Header />
        {children}
      </main>
    </div>
  );
}

export default function BoardLayout({ children }) {
  return (
    <SidebarProvider>
      <BoardLayoutInner>{children}</BoardLayoutInner>
    </SidebarProvider>
  );
}
