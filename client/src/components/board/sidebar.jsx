import { useEffect, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  Activity,
  BarChart3,
  FolderKanban,
  ListTodo,
  LogOut,
  Moon,
  PanelLeftClose,
  Settings,
  Sun,
  UserCheck,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { LogoutConfirmationDialog } from "@/components/auth/LogoutConfirmationDialog";
import { UserAvatar } from "@/components/ui/avatar";
import { CURRENT_PROJECT_CHANGE_EVENT, CURRENT_PROJECT_KEY } from "@/components/board/project-switcher";
import { useAuth } from "@/contexts/auth-context";
import { useTheme } from "@/contexts/theme-context";
import { LEGACY_STORAGE_KEYS, migrateStorageKey } from "@/lib/storage-keys";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";

const SIDEBAR_WIDTH_EXPANDED = 280;
const SIDEBAR_WIDTH_COLLAPSED = 56;

function SidebarBrand({ collapsed = false }) {
  return (
    <Link
      to="/for-you"
      className={cn(
        "group flex min-w-0 items-center rounded-md text-foreground transition-colors hover:bg-accent",
        collapsed ? "h-9 w-9 justify-center" : "h-9 flex-1 gap-2 px-1"
      )}
      aria-label="Sprintly home"
      title={collapsed ? "Sprintly" : undefined}
    >
      <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md border border-primary/20 bg-primary text-sm font-bold text-primary-foreground shadow-sm">
        S
      </span>
      {!collapsed ? (
        <span className="min-w-0">
          <span className="block truncate text-[15px] font-bold leading-4 tracking-normal">Sprintly</span>
          <span className="block truncate text-[10px] font-semibold uppercase tracking-wide text-muted-foreground">Project OS</span>
        </span>
      ) : null}
    </Link>
  );
}

function SidebarLink({ item, pathname, collapsed = false, onNavigate, className }) {
  const Icon = item.icon;
  const disabled = Boolean(item.disabled);
  const active = !disabled && item.match(pathname);

  function handleClick(event) {
    if (disabled) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    onNavigate?.(event);
  }

  return (
    <Link
      to={disabled ? pathname : item.to}
      className={cn(
        "group relative flex min-h-9 w-full items-center gap-2 rounded-md text-sm transition-colors",
        "text-muted-foreground hover:bg-accent hover:text-foreground",
        collapsed ? "h-9 w-9 justify-center px-0 py-0" : "min-h-9 px-[7px] py-1",
        active && "bg-sidebar-active font-medium text-primary",
        disabled && "cursor-not-allowed opacity-45 hover:bg-transparent hover:text-muted-foreground",
        className
      )}
      aria-label={item.label}
      aria-disabled={disabled || undefined}
      tabIndex={disabled ? -1 : undefined}
      title={collapsed ? item.label : undefined}
      onClick={handleClick}
    >
      <span
        className={cn(
          "absolute left-0 top-1/2 h-5 w-0.5 -translate-y-1/2 rounded-full bg-primary opacity-0 transition-opacity",
          active && "opacity-100"
        )}
      />
      <Icon className={cn("h-[18px] w-[18px] shrink-0", active ? "text-primary" : "text-muted-foreground", !disabled && "group-hover:text-foreground")} />
      {!collapsed ? <span className="min-w-0 flex-1 truncate">{item.label}</span> : null}
    </Link>
  );
}

function FooterAction({ icon: Icon, label, collapsed, onClick }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="icon"
      className={cn(
        "h-9 border border-border bg-transparent shadow-none",
        collapsed ? "w-9 justify-center px-0" : "w-full justify-start px-[7px]"
      )}
      aria-label={label}
      title={collapsed ? label : undefined}
      onClick={onClick}
    >
      <Icon className="h-[18px] w-[18px]" />
      {!collapsed ? <span className="text-sm">{label}</span> : null}
    </Button>
  );
}

function SidebarNavGroups({ groups, pathname, collapsed }) {
  return (
    <nav className={cn("space-y-4", collapsed && "space-y-2")} aria-label="Sidebar navigation">
      {groups.map((group, index) => (
        <section key={group.title} className={cn("space-y-1", collapsed && "space-y-1.5")} aria-label={group.title}>
          {index === 0 ? null : collapsed ? (
            <div className="mx-auto h-px w-7 bg-border/80" aria-hidden="true" />
          ) : (
            <h2 className="px-[7px] text-[11px] font-semibold uppercase tracking-wide text-muted-foreground/80">
              {group.title}
            </h2>
          )}
          <div className="space-y-1">
            {group.items.map((item) => (
              <SidebarLink key={item.to} item={item} pathname={pathname} collapsed={collapsed} />
            ))}
          </div>
        </section>
      ))}
    </nav>
  );
}

function SidebarAccountMenu({ user, collapsed }) {
  const navigate = useNavigate();
  const { logout } = useAuth();
  const { resolvedTheme, toggleTheme } = useTheme();
  const [open, setOpen] = useState(false);
  const [confirmLogout, setConfirmLogout] = useState(false);
  const [logoutPending, setLogoutPending] = useState(false);
  const menuRef = useRef(null);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!menuRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function requestLogout() {
    setOpen(false);
    setConfirmLogout(true);
  }

  async function confirmLogoutAction() {
    if (logoutPending) return;

    setLogoutPending(true);
    try {
      await logout();
    } finally {
      setLogoutPending(false);
      setConfirmLogout(false);
      navigate("/login", { replace: true });
    }
  }

  return (
    <>
      <div className="relative space-y-2" ref={menuRef}>
        <FooterAction icon={resolvedTheme === "dark" ? Sun : Moon} label={resolvedTheme === "dark" ? "Light mode" : "Dark mode"} collapsed={collapsed} onClick={toggleTheme} />

        <button
          type="button"
          className={cn(
            "flex w-full min-w-0 items-center rounded-md border border-border bg-transparent text-left shadow-none transition-colors hover:bg-accent",
            collapsed ? "h-9 w-9 justify-center p-0" : "h-9 gap-2 px-[7px]"
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
              "z-50 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg",
              collapsed
                ? "fixed bottom-3 left-[64px] w-64"
                : "absolute bottom-full left-0 right-0 mb-2"
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
                onClick={requestLogout}
              >
                <LogOut className="h-4 w-4" />
                Log out
              </button>
            </div>
          </div>
        ) : null}
      </div>
      <LogoutConfirmationDialog
        open={confirmLogout}
        pending={logoutPending}
        onCancel={() => setConfirmLogout(false)}
        onConfirm={confirmLogoutAction}
      />
    </>
  );
}

function SidebarMenuScroll({ collapsed, children }) {
  const scrollRef = useRef(null);
  const dragOffsetRef = useRef(0);
  const [scrollState, setScrollState] = useState({
    clientHeight: 0,
    scrollHeight: 0,
    scrollTop: 0,
  });

  function syncScrollState() {
    const element = scrollRef.current;
    if (!element) return;

    setScrollState({
      clientHeight: element.clientHeight,
      scrollHeight: element.scrollHeight,
      scrollTop: element.scrollTop,
    });
  }

  useEffect(() => {
    syncScrollState();

    const element = scrollRef.current;
    if (!element) return undefined;

    window.addEventListener("resize", syncScrollState);

    if (typeof ResizeObserver === "undefined") {
      return () => window.removeEventListener("resize", syncScrollState);
    }

    const observer = new ResizeObserver(syncScrollState);
    observer.observe(element);
    if (element.firstElementChild) observer.observe(element.firstElementChild);

    return () => {
      window.removeEventListener("resize", syncScrollState);
      observer.disconnect();
    };
  }, [collapsed]);

  const canScroll = scrollState.scrollHeight > scrollState.clientHeight + 1;
  const thumbHeight = canScroll
    ? Math.max(36, (scrollState.clientHeight / scrollState.scrollHeight) * scrollState.clientHeight)
    : 0;
  const thumbTop = canScroll
    ? (scrollState.scrollTop / (scrollState.scrollHeight - scrollState.clientHeight)) * (scrollState.clientHeight - thumbHeight)
    : 0;

  function scrollToPointer(clientY, railElement, offset = thumbHeight / 2) {
    const element = scrollRef.current;
    if (!element || !canScroll) return;

    const rect = railElement.getBoundingClientRect();
    const maxThumbTop = scrollState.clientHeight - thumbHeight;
    const nextThumbTop = Math.min(Math.max(clientY - rect.top - offset, 0), maxThumbTop);
    element.scrollTop = (nextThumbTop / maxThumbTop) * (scrollState.scrollHeight - scrollState.clientHeight);
  }

  function handleRailPointerDown(event) {
    if (!canScroll) return;

    const railElement = event.currentTarget;
    scrollToPointer(event.clientY, railElement);
    railElement.setPointerCapture(event.pointerId);
  }

  function handleThumbPointerDown(event) {
    if (!canScroll) return;

    event.stopPropagation();
    const rect = event.currentTarget.getBoundingClientRect();
    dragOffsetRef.current = event.clientY - rect.top;
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handleThumbPointerMove(event) {
    if (!canScroll || !event.currentTarget.hasPointerCapture(event.pointerId)) return;

    const railElement = event.currentTarget.parentElement;
    if (!railElement) return;

    scrollToPointer(event.clientY, railElement, dragOffsetRef.current);
  }

  return (
    <div className="relative min-h-0 flex-1">
      <div
        ref={scrollRef}
        className={cn(
          "sidebar-native-scroll h-full overflow-y-auto overflow-x-hidden",
          collapsed ? "px-2.5 py-2" : "px-3 py-2"
        )}
        onScroll={syncScrollState}
      >
        {children}
      </div>
      {canScroll ? (
        <div
          className="absolute bottom-0 right-px top-0 z-50 w-2 cursor-pointer bg-sidebar"
          aria-hidden="true"
          onPointerDown={handleRailPointerDown}
        >
          <span
            className="absolute left-1/2 w-1.5 cursor-grab bg-muted-foreground/55 active:cursor-grabbing"
            style={{ height: thumbHeight, transform: `translate(-50%, ${thumbTop}px)` }}
            onPointerDown={handleThumbPointerDown}
            onPointerMove={handleThumbPointerMove}
          />
        </div>
      ) : null}
    </div>
  );
}

function SidebarShell({ collapsed, children }) {
  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen flex-col overflow-hidden border-r bg-sidebar text-sidebar-foreground"
      style={{ width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
    >
      {children}
    </aside>
  );
}

export function Sidebar() {
  const { pathname } = useLocation();
  const { collapsed, setCollapsed } = useSidebar();
  const { user } = useAuth();
  const routeProjectId = pathname.match(/^\/(?:projects|spaces)\/([^/]+)/)?.[1];
  const [storedProjectId, setStoredProjectId] = useState(() => migrateStorageKey(LEGACY_STORAGE_KEYS.currentProjectId, CURRENT_PROJECT_KEY) || "");
  const currentProjectId = routeProjectId || storedProjectId;
  const issuesPath = currentProjectId ? `/spaces/${currentProjectId}/issues` : "/issues";
  const spacesActive = pathname === "/spaces" || pathname === "/projects" || /^\/(?:projects|spaces)\/[^/]+$/.test(pathname);
  const issuesActive = pathname === "/issues" || pathname === "/tasks" || /^\/(?:projects|spaces)\/[^/]+\/(?:issues|tasks)/.test(pathname);

  const forYouItem = {
    label: "For You",
    to: "/for-you",
    icon: UserCheck,
    match: (currentPath) => currentPath === "/" || currentPath === "/dashboard" || currentPath === "/for-you" || currentPath === "/recent",
  };
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
  const activityItem = {
    label: "Activity",
    to: "/activity",
    icon: Activity,
    match: (currentPath) => currentPath === "/activity" || currentPath === "/pull-requests" || currentPath === "/deployments",
  };
  const reportsItem = {
    label: "Reports",
    to: "/reports",
    icon: BarChart3,
    match: (currentPath) => currentPath === "/reports" || currentPath === "/goals",
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
      title: "Overview",
      items: [
        forYouItem,
      ],
    },
    {
      title: "Projects",
      items: [
        spacesItem,
        issueItem,
      ],
    },
    {
      title: "Team",
      items: [
        teamsItem,
        activityItem,
      ],
    },
    {
      title: "Insights",
      items: [reportsItem],
    },
    {
      title: "Manage",
      items: [settingItem],
    },
  ];

  useEffect(() => {
    if (!routeProjectId) return;
    localStorage.setItem(CURRENT_PROJECT_KEY, routeProjectId);
    setStoredProjectId(routeProjectId);
    window.dispatchEvent(new CustomEvent(CURRENT_PROJECT_CHANGE_EVENT, { detail: routeProjectId }));
  }, [routeProjectId]);

  useEffect(() => {
    function handleProjectChange(event) {
      setStoredProjectId(event.detail || localStorage.getItem(CURRENT_PROJECT_KEY) || "");
    }

    window.addEventListener(CURRENT_PROJECT_CHANGE_EVENT, handleProjectChange);
    return () => window.removeEventListener(CURRENT_PROJECT_CHANGE_EVENT, handleProjectChange);
  }, []);

  if (collapsed) {
    return (
      <SidebarShell collapsed>
        <div className="flex h-14 items-center justify-center border-b px-2">
          <Button variant="ghost" size="icon" className="h-9 w-9 p-0" onClick={() => setCollapsed(false)} aria-label="Expand sidebar" title="Sprintly">
            <span className="flex h-8 w-8 items-center justify-center rounded-md border border-primary/20 bg-primary text-sm font-bold text-primary-foreground shadow-sm">
              S
            </span>
          </Button>
        </div>

        <SidebarMenuScroll collapsed>
          <div className="flex min-h-0 flex-col">
            <div className="min-h-0 overflow-x-hidden">
              <SidebarNavGroups groups={navGroups} pathname={pathname} collapsed />
            </div>
          </div>
        </SidebarMenuScroll>

        <div className="mt-auto border-t p-2.5">
          <div className="space-y-2">
            <SidebarAccountMenu user={user} collapsed />
          </div>
        </div>
      </SidebarShell>
    );
  }

  return (
    <SidebarShell collapsed={false}>
      <div className="flex h-14 items-center justify-between gap-2 border-b px-3">
        <SidebarBrand />
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={() => setCollapsed(true)} aria-label="Collapse sidebar">
          <PanelLeftClose className="h-4 w-4" />
        </Button>
      </div>

      <SidebarMenuScroll collapsed={false}>
        <div className="flex min-h-0 flex-col">
          <div className="min-h-0 overflow-x-hidden">
            <SidebarNavGroups groups={navGroups} pathname={pathname} />
          </div>
        </div>
      </SidebarMenuScroll>

      <div className="mt-auto border-t px-3 py-2.5">
        <div className="space-y-2">
          <SidebarAccountMenu user={user} />
        </div>
      </div>
    </SidebarShell>
  );
}

export default Sidebar;
