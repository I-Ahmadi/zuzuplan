import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  Clock3,
  Activity,
  BarChart3,
  BookOpen,
  Boxes,
  Check,
  ChevronDown,
  FolderKanban,
  Home,
  ListTodo,
  LogOut,
  Moon,
  PanelLeftClose,
  ScrollText,
  Settings,
  Sun,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/components/ui/pagination";
import { UserAvatar } from "@/components/ui/avatar";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { getProject, getProjects } from "@/lib/project-api";
import { LEGACY_STORAGE_KEYS, migrateStorageKey, STORAGE_KEYS } from "@/lib/storage-keys";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";

const SIDEBAR_WIDTH_EXPANDED = 300;
const SIDEBAR_WIDTH_COLLAPSED = 56;
const CURRENT_PROJECT_KEY = STORAGE_KEYS.currentProjectId;
const CURRENT_PROJECT_CHANGE_EVENT = "current-project-change";

function getSwitchedProjectPath(pathname, currentProjectId, nextProjectId) {
  const segments = pathname.split("/");
  const projectScope = segments[1] === "spaces" || segments[1] === "projects";
  if (!projectScope || segments[2] !== currentProjectId) return null;

  const nextSegments = [...segments];
  nextSegments[2] = nextProjectId;
  return nextSegments.join("/") || "/";
}

function SidebarLink({ item, pathname, collapsed = false, onNavigate }) {
  const Icon = item.icon;
  const active = item.match(pathname);

  return (
    <Link
      to={item.to}
      className={cn(
        "group relative flex min-h-9 w-full items-center gap-2 rounded-md text-sm transition-colors",
        "text-muted-foreground hover:bg-accent hover:text-foreground",
        collapsed ? "h-9 justify-center px-0" : "min-h-9 px-2.5 py-1",
        active && "bg-sidebar-active font-medium text-primary"
      )}
      aria-label={item.label}
      title={collapsed ? item.label : undefined}
      onClick={onNavigate}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity",
          active && "opacity-100"
        )}
      />
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground group-hover:text-foreground")} />
      {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
    </Link>
  );
}

function NavSection({ items, pathname, collapsed, onNavigate }) {
  return (
    <div className="space-y-1">
      {items.map((item) => (
        <SidebarLink key={item.to} item={item} pathname={pathname} collapsed={collapsed} onNavigate={onNavigate} />
      ))}
    </div>
  );
}

function FooterAction({ icon: Icon, label, collapsed, onClick }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn("w-full border border-border bg-transparent shadow-none", collapsed ? "h-9" : "h-9 justify-start px-2.5")}
      aria-label={label}
      title={collapsed ? label : undefined}
      onClick={onClick}
    >
      <Icon className="h-4 w-4" />
      {!collapsed ? <span className="text-sm">{label}</span> : null}
    </Button>
  );
}

function SidebarNavGroups({ groups, pathname, collapsed }) {
  return (
    <div className="space-y-2">
      {groups.map((group, index) => (
        <div key={group.title} className={cn(index > 0 && "border-t border-border/70 pt-2")}>
          <NavSection items={group.items} pathname={pathname} collapsed={collapsed} />
        </div>
      ))}
    </div>
  );
}

function SidebarProjectSwitcher({ collapsed, pathname, search, routeProjectId, currentProjectId, onProjectChange }) {
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const switcherRef = useRef(null);
  const projectsQuery = useQuery({
    queryKey: ["projects", "sidebar-switcher"],
    queryFn: () => getProjects({ limit: PAGE_SIZE }),
    staleTime: 60 * 1000,
  });
  const projects = useMemo(() => projectsQuery.data?.data || [], [projectsQuery.data]);
  const resolvedProjectId = currentProjectId || projects[0]?.id || "";
  const projectQuery = useQuery({
    queryKey: ["sidebar-project", resolvedProjectId],
    queryFn: () => getProject(resolvedProjectId),
    enabled: Boolean(resolvedProjectId),
    staleTime: 60 * 1000,
  });
  const currentProject = projectQuery.data?.data || projects.find((project) => project.id === resolvedProjectId);

  useEffect(() => {
    if (currentProjectId || !projects[0]?.id) return;
    localStorage.setItem(CURRENT_PROJECT_KEY, projects[0].id);
    onProjectChange(projects[0].id);
  }, [currentProjectId, onProjectChange, projects]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!switcherRef.current?.contains(event.target)) setOpen(false);
    }

    function closeOnEscape(event) {
      if (event.key === "Escape") setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    document.addEventListener("keydown", closeOnEscape);
    return () => {
      document.removeEventListener("mousedown", closeOnOutsideClick);
      document.removeEventListener("keydown", closeOnEscape);
    };
  }, []);

  function switchProject(nextProjectId) {
    localStorage.setItem(CURRENT_PROJECT_KEY, nextProjectId);
    onProjectChange(nextProjectId);
    window.dispatchEvent(new CustomEvent(CURRENT_PROJECT_CHANGE_EVENT, { detail: nextProjectId }));
    setOpen(false);
    if (routeProjectId) {
      const nextPath = getSwitchedProjectPath(pathname, routeProjectId, nextProjectId);
      if (nextPath && nextPath !== pathname) {
        navigate(`${nextPath}${search}`);
      }
    }
  }

  if (!currentProject && !projectsQuery.isLoading) return null;

  return (
    <div className="relative" ref={switcherRef}>
      <button
        type="button"
        className={cn(
          "flex w-full min-w-0 items-center rounded-md border border-border bg-transparent text-left shadow-none transition-colors hover:bg-accent",
          collapsed ? "h-9 justify-center p-1" : "h-9 gap-2 px-2.5"
        )}
        aria-label="Switch project"
        aria-expanded={open}
        aria-haspopup="menu"
        title={collapsed ? currentProject?.name || "Switch project" : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border bg-background text-[10px] font-bold text-primary">
          {currentProject?.key?.slice(0, 2).toUpperCase() || "SP"}
        </span>
        {!collapsed ? (
          <>
            <span className="min-w-0 flex-1">
              <span className="block truncate text-sm font-medium">{currentProject?.name || "Switch project"}</span>
            </span>
            <ChevronDown className={cn("h-4 w-4 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
          </>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute bottom-full left-0 z-50 mb-2 w-72 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg",
            collapsed && "left-full bottom-0 ml-2"
          )}
          role="menu"
        >
          <div className="border-b px-3 py-2">
            <p className="text-xs font-medium uppercase text-muted-foreground">Switch project</p>
          </div>
          <div className="max-h-72 overflow-y-auto p-1">
            {projects.map((project) => {
              const active = project.id === currentProject?.id;
              return (
                <button
                  key={project.id}
                  type="button"
                  className={cn(
                    "flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm transition-colors hover:bg-accent",
                    active && "bg-accent"
                  )}
                  onClick={() => switchProject(project.id)}
                  role="menuitem"
                >
                  <span className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-primary text-[10px] font-bold text-primary-foreground">
                    {project.key?.slice(0, 2).toUpperCase() || "SP"}
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate font-medium">{project.name}</span>
                    <span className="block truncate text-xs text-muted-foreground">{project.key}</span>
                  </span>
                  {active ? <Check className="h-4 w-4 shrink-0 text-primary" /> : null}
                </button>
              );
            })}
            {!projectsQuery.isLoading && projects.length === 0 ? (
              <p className="px-2 py-6 text-center text-sm text-muted-foreground">No spaces yet.</p>
            ) : null}
          </div>
          <div className="border-t p-1">
            <Link className="block rounded px-2 py-2 text-sm hover:bg-accent" to="/spaces" onClick={() => setOpen(false)}>
              View all spaces
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  );
}

function SidebarAccountMenu({ user, collapsed }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  async function handleLogout() {
    setOpen(false);
    await logout();
    navigate("/login", { replace: true });
  }

  return (
    <div className={cn("relative space-y-2", collapsed ? "p-2" : "p-3")} ref={menuRef}>
      <FooterAction icon={resolvedTheme === "dark" ? Sun : Moon} label={resolvedTheme === "dark" ? "Light mode" : "Dark mode"} collapsed={collapsed} onClick={toggleTheme} />

      <button
        type="button"
        className={cn(
          "flex w-full min-w-0 items-center rounded-md border border-border bg-transparent text-left shadow-none transition-colors hover:bg-accent",
          collapsed ? "h-9 justify-center p-1" : "h-9 gap-2 px-2.5"
        )}
        onClick={() => setOpen((current) => !current)}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Account menu"
        title={collapsed ? user?.name || "Account menu" : undefined}
      >
        <UserAvatar user={user} fallback="ME" className={collapsed ? "h-7 w-7" : "h-6 w-6"} fallbackClassName="bg-primary text-primary-foreground" />
        {!collapsed ? (
          <span className="min-w-0 flex-1">
            <span className="block truncate text-sm font-medium">{user?.name || "Your profile"}</span>
          </span>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute bottom-3 left-full z-50 ml-2 w-64 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg",
            collapsed && "bottom-2"
          )}
          role="menu"
        >
          <div className="border-b px-3 py-2">
            <div className="flex min-w-0 items-center gap-2">
              <UserAvatar user={user} fallback="ME" className="h-8 w-8" fallbackClassName="bg-primary text-primary-foreground" />
              <div className="min-w-0">
                <p className="truncate text-sm font-medium">{user?.name || "Your profile"}</p>
                <p className="truncate text-xs text-muted-foreground">{user?.email || "Account"}</p>
              </div>
            </div>
          </div>
          <div className="p-1">
            <Link
              to="/settting"
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-sm transition-colors hover:bg-accent"
              role="menuitem"
              onClick={() => setOpen(false)}
            >
              <Settings className="h-4 w-4 text-muted-foreground" />
              Settings
            </Link>
            <button
              type="button"
              className="flex w-full items-center gap-2 rounded px-2 py-2 text-left text-sm text-destructive transition-colors hover:bg-destructive/10"
              role="menuitem"
              onClick={handleLogout}
            >
              <LogOut className="h-4 w-4" />
              Log out
            </button>
          </div>
        </div>
      ) : null}
    </div>
  );
}

export function Sidebar() {
  const { pathname, search } = useLocation();
  const { collapsed, setCollapsed } = useSidebar();
  const { user } = useAuth();
  const routeProjectId = pathname.match(/^\/(?:projects|spaces)\/([^/]+)/)?.[1];
  const [storedProjectId, setStoredProjectId] = useState(() => migrateStorageKey(LEGACY_STORAGE_KEYS.currentProjectId, CURRENT_PROJECT_KEY) || "");
  const currentProjectId = routeProjectId || storedProjectId;
  const issuesPath = currentProjectId ? `/spaces/${currentProjectId}/issues` : "/issues";
  const spacesActive = pathname === "/spaces" || pathname === "/projects" || /^\/(?:projects|spaces)\/[^/]+$/.test(pathname);
  const issuesActive = pathname === "/issues" || pathname === "/tasks" || /^\/(?:projects|spaces)\/[^/]+\/(?:issues|tasks)/.test(pathname);

  const issueItem = {
    label: "Issues",
    to: issuesPath,
    icon: ListTodo,
    match: () => issuesActive,
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
    label: "Settings",
    to: "/settting",
    icon: Settings,
    match: (currentPath) => currentPath === "/settting" || currentPath === "/settings",
  };
  const navGroups = [
    {
      title: "Personal",
      items: [
        { label: "For You", to: "/for-you", icon: Home, match: (currentPath) => currentPath === "/" || currentPath === "/for-you" || currentPath === "/dashboard" },
        { label: "My Issues", to: "/my-issues", icon: UserCheck, match: (currentPath) => currentPath === "/my-issues" || currentPath === "/my-tasks" },
        { label: "Recent", to: "/recent", icon: Clock3, match: (currentPath) => currentPath === "/recent" },
      ],
    },
    {
      title: "Work",
      items: [
        issueItem,
        spacesItem,
        { label: "Knowledge", to: "/knowledge", icon: BookOpen, match: (currentPath) => currentPath === "/knowledge" },
        teamsItem,
      ],
    },
    {
      title: "Insights",
      items: [
        { label: "Reports", to: "/reports", icon: BarChart3, match: (currentPath) => currentPath === "/reports" },
        { label: "Activity", to: "/activity", icon: Activity, match: (currentPath) => currentPath === "/activity" },
      ],
    },
    {
      title: "System",
      items: [
        { label: "Integrations", to: "/integrations", icon: Boxes, match: (currentPath) => currentPath === "/integrations" },
        settingItem,
        { label: "Audit Log", to: "/audit-log", icon: ScrollText, match: (currentPath) => currentPath === "/audit-log" },
      ],
    },
  ];

  useEffect(() => {
    if (!routeProjectId) return;
    localStorage.setItem(CURRENT_PROJECT_KEY, routeProjectId);
    setStoredProjectId(routeProjectId);
  }, [routeProjectId]);

  if (collapsed) {
    return (
      <aside
        className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground"
        style={{ width: SIDEBAR_WIDTH_COLLAPSED }}
      >
        <div className="flex h-14 items-center justify-center border-b px-2">
          <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(false)} aria-label="Expand sidebar">
            <PanelLeftClose className="h-4 w-4 rotate-180" />
          </Button>
        </div>

        <div className="min-h-0 flex-1 px-2 py-2">
          <div className="flex h-full min-h-0 flex-col">
            <div className="min-h-0 flex-1 overflow-y-auto">
              <SidebarNavGroups groups={navGroups} pathname={pathname} collapsed />
            </div>
          </div>
        </div>

        <div className="border-t">
          <div className="p-2 pb-0">
            <SidebarProjectSwitcher
              collapsed
              pathname={pathname}
              search={search}
              routeProjectId={routeProjectId}
              currentProjectId={currentProjectId}
              onProjectChange={setStoredProjectId}
            />
          </div>
          <SidebarAccountMenu user={user} collapsed />
        </div>
      </aside>
    );
  }

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r bg-sidebar text-sidebar-foreground"
      style={{ width: SIDEBAR_WIDTH_EXPANDED }}
    >
      <div className="flex h-14 items-center justify-between border-b px-3">
        <Link to="/for-you" className="rounded-md px-1 py-1 text-sm font-semibold hover:bg-accent">
          Workspace
        </Link>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar">
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <div className="min-h-0 flex-1 px-3 py-2">
        <div className="flex h-full min-h-0 flex-col">
          <div className="min-h-0 flex-1 overflow-y-auto">
            <SidebarNavGroups groups={navGroups} pathname={pathname} />
          </div>
        </div>
      </div>

      <div className="border-t">
        <div className="px-3 pt-3">
          <SidebarProjectSwitcher
            pathname={pathname}
            search={search}
            routeProjectId={routeProjectId}
            currentProjectId={currentProjectId}
            onProjectChange={setStoredProjectId}
          />
        </div>
        <SidebarAccountMenu user={user} />
      </div>
    </aside>
  );
}

export default Sidebar;
