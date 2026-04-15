import { Link, useLocation, useNavigate } from "react-router-dom";
import {
  FolderKanban,
  LayoutDashboard,
  ListTodo,
  LogOut,
  Moon,
  PanelLeft,
  PanelLeftClose,
  Settings,
  Sun,
  Users,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useSidebar } from "@/contexts/sidebar-context";
import { useTheme } from "@/contexts/theme-context";

const SIDEBAR_WIDTH_EXPANDED = 260;
const SIDEBAR_WIDTH_COLLAPSED = 70;

const navItems = [
  { to: "/", label: "Home", icon: LayoutDashboard },
  { to: "/tasks", label: "Tasks", icon: ListTodo },
  { to: "/projects", label: "Projects", icon: FolderKanban },
  { to: "/team", label: "Team", icon: Users },
  { to: "/settting", label: "Settings", icon: Settings },
];

export function Sidebar() {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const { collapsed, setCollapsed } = useSidebar();
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <aside
      className="fixed left-0 top-0 z-40 flex h-screen flex-col border-r border-border bg-card text-card-foreground transition-[width] duration-300 ease-in-out"
      style={{ width: collapsed ? SIDEBAR_WIDTH_COLLAPSED : SIDEBAR_WIDTH_EXPANDED }}
    >
      <div className={cn("flex h-14 items-center border-b border-border", collapsed ? "justify-center px-0" : "justify-between px-3")}>
        {!collapsed && (
          <Link to="/" className="flex items-center gap-3">
            <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-primary text-primary-foreground">
              <LayoutDashboard className="h-4 w-4" />
            </div>
            <span className="text-base font-semibold">ZuzuPlan</span>
          </Link>
        )}
        <Button
          variant="ghost"
          size="icon"
          className="h-9 w-9 shrink-0"
          onClick={() => setCollapsed(!collapsed)}
          aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
        >
          {collapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
        </Button>
      </div>

      <nav className="flex-1 space-y-1 p-3">
        {navItems.map((item) => {
          const active = item.to === "/" ? pathname === "/" : pathname.startsWith(item.to);
          const Icon = item.icon;

          return (
            <Link
              key={item.to}
              to={item.to}
              className={cn(
                "flex min-h-10 items-center rounded-md text-sm font-medium transition-colors hover:bg-accent hover:text-accent-foreground",
                active && "bg-accent text-accent-foreground",
                collapsed ? "justify-center px-0" : "gap-3 px-3"
              )}
            >
              <Icon className="h-4 w-4 shrink-0" />
              {!collapsed && <span>{item.label}</span>}
            </Link>
          );
        })}
      </nav>

      <div className="space-y-2 border-t border-border p-3">
        <Button
          variant="outline"
          className={cn("w-full", collapsed && "px-0")}
          onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
        >
          {resolvedTheme === "dark" ? <Sun className="h-4 w-4" /> : <Moon className="h-4 w-4" />}
          {!collapsed && <span>{resolvedTheme === "dark" ? "Light mode" : "Dark mode"}</span>}
        </Button>
        <Button
          variant="outline"
          className={cn("w-full text-destructive", collapsed && "px-0")}
          onClick={() => {
            localStorage.removeItem("user");
            localStorage.removeItem("accessToken");
            navigate("/login");
          }}
        >
          <LogOut className="h-4 w-4" />
          {!collapsed && <span>Logout</span>}
        </Button>
      </div>
    </aside>
  );
}

export default Sidebar;
