import { useLocation } from "react-router-dom";
import { useEffect } from "react";
import Header from "@/components/board/header";
import { Sidebar } from "@/components/board/sidebar";
import { SidebarProvider, useSidebar } from "@/contexts/sidebar-context";
import { cleanupLegacyStorage } from "@/lib/storage-keys";

const SIDEBAR_WIDTH_EXPANDED = 280;
const SIDEBAR_WIDTH_COLLAPSED = 56;
const AUTH_PATHS = ["/login", "/signup", "/verify-email", "/forgot-password", "/reset-password"];

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
    <div className="min-h-screen overflow-x-hidden bg-background">
      <Sidebar />
      <main
        className="min-w-0 min-h-screen max-w-full overflow-x-hidden transition-[margin-left,width] duration-300 ease-in-out"
        style={{ marginLeft: sidebarWidth, width: `calc(100% - ${sidebarWidth}px)` }}
      >
        <Header />
        <div className="mx-auto w-full max-w-[1600px] min-w-0 overflow-x-hidden">
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
