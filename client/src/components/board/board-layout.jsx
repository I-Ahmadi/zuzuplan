import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/board/header";
import { Sidebar } from "@/components/board/sidebar";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";
import { cleanupLegacyStorage } from "@/lib/storage-keys";

const SIDEBAR_WIDTH_EXPANDED = 280;
const SIDEBAR_WIDTH_COLLAPSED = 56;
const AUTH_PATHS = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"];
const PORTAL_CONTENT_CLASS = "w-full";

function BoardLayoutInner({ children }) {
  const { pathname } = useLocation();
  const { collapsed } = useSidebar();
  const sidebarWidth = collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED;
  const isAuthPage = AUTH_PATHS.some((p) => pathname === p || pathname.startsWith(`${p}/`));

  useEffect(() => {
    cleanupLegacyStorage();
  }, []);

  if (isAuthPage) {
    return <div className="min-h-screen bg-background">{children}</div>;
  }

  return (
    <div className="min-h-screen bg-background">
      <Sidebar />
      <main
        className="fixed bottom-0 right-0 top-0 min-w-0 overflow-y-auto overflow-x-clip transition-[left] duration-300 ease-in-out"
        style={{ left: sidebarWidth }}
      >
        <Header />
        <div className={PORTAL_CONTENT_CLASS}>
          {children}
        </div>
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
