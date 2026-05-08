import { Link, useLocation } from "react-router-dom";
import {
  Clock3,
  FolderKanban,
  Home,
  ListTodo,
  PanelLeftClose,
  Settings,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";

const SIDEBAR_WIDTH_EXPANDED = 280;
const SIDEBAR_WIDTH_COLLAPSED = 56;
const CURRENT_PROJECT_KEY = "zuzuplan.currentProjectId";

const MENU_ITEMS = [
  { label: "For You", to: "/for-you", icon: Home, match: (pathname) => pathname === "/" || pathname === "/for-you" || pathname === "/dashboard" },
  { label: "Recent", to: "/recent", icon: Clock3, match: (pathname) => pathname === "/recent" },
];

function SidebarLink({ item, pathname, collapsed = false }) {
  const Icon = item.icon;
  const active = item.match(pathname);

  return (
    <Link
      to={item.to}
      className={cn(
        "flex min-h-8 w-full items-center gap-2 rounded-md text-sm transition-colors hover:bg-[hsl(var(--sidebar-hover))]",
        collapsed ? "h-9 justify-center px-0" : "px-2.5 py-1.5",
        active && "bg-[hsl(var(--sidebar-active))] text-foreground"
      )}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
    >
      <Icon className="h-5 w-5 shrink-0" />
      {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
    </Link>
  );
}

export function Sidebar() {
  const { pathname } = useLocation();
  const { collapsed, setCollapsed } = useSidebar();
  const routeProjectId = pathname.match(/^\/(?:projects|spaces)\/([^/]+)/)?.[1];
  const currentProjectId = routeProjectId || localStorage.getItem(CURRENT_PROJECT_KEY);
  const tasksPath = currentProjectId ? `/spaces/${currentProjectId}/tasks` : "/tasks";
  const spacesActive = pathname === "/spaces" || pathname === "/projects" || /^\/(?:projects|spaces)\/[^/]+$/.test(pathname);
  const tasksActive = pathname === "/tasks" || /^\/(?:projects|spaces)\/[^/]+\/tasks/.test(pathname);

  const taskItem = {
    label: "Board",
    to: tasksPath,
    icon: ListTodo,
    match: () => tasksActive,
  };
  const spacesItem = {
    label: "Spaces",
    to: "/spaces",
    icon: FolderKanban,
    match: () => spacesActive,
  };
  const teamsItem = {
    label: "Teams",
    to: "/team-members",
    icon: Users,
    match: (currentPath) => currentPath === "/team" || currentPath === "/team-members",
  };
  const settingItem = {
    label: "Setting",
    to: "/settting",
    icon: Settings,
    match: (currentPath) => currentPath === "/settting" || currentPath === "/settings",
  };

  if (collapsed) {
    return (
      <aside
        className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]"
        style={{ width: SIDEBAR_WIDTH_COLLAPSED }}
      >
        <div className="flex h-12 items-center justify-center border-b px-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(false)} aria-label="Expand sidebar">
            <PanelLeftClose className="h-4 w-4 rotate-180" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
          <div className="space-y-1">
            {MENU_ITEMS.map((item) => (
              <SidebarLink key={item.to} item={item} pathname={pathname} collapsed />
            ))}
            <SidebarLink item={taskItem} pathname={pathname} collapsed />
            <SidebarLink item={spacesItem} pathname={pathname} collapsed />
            <SidebarLink item={teamsItem} pathname={pathname} collapsed />
            <SidebarLink item={settingItem} pathname={pathname} collapsed />
          </div>
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-[hsl(var(--sidebar))] text-[hsl(var(--sidebar-foreground))]"
      style={{ width: SIDEBAR_WIDTH_EXPANDED }}
    >
      <div className="flex h-12 items-center justify-end border-b px-2">
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar">
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 overflow-y-auto px-2 py-2">
        <div className="space-y-1">
          {MENU_ITEMS.map((item) => (
            <SidebarLink key={item.to} item={item} pathname={pathname} />
          ))}
          <SidebarLink item={taskItem} pathname={pathname} />
          <SidebarLink item={spacesItem} pathname={pathname} />
          <SidebarLink item={teamsItem} pathname={pathname} />
          <SidebarLink item={settingItem} pathname={pathname} />
        </div>
      </div>

    </aside>
  );
}

export default Sidebar;
