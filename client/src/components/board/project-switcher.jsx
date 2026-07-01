import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { Check, ChevronDown } from "lucide-react";
import { PAGE_SIZE } from "@/components/ui/pagination";
import { useApiResource } from "@/lib/api-hooks";
import { getProject, getProjects } from "@/lib/project-api";
import { LEGACY_STORAGE_KEYS, migrateStorageKey, STORAGE_KEYS } from "@/lib/storage-keys";
import { cn } from "@/lib/utils";

export const CURRENT_PROJECT_KEY = STORAGE_KEYS.currentProjectId;
export const CURRENT_PROJECT_CHANGE_EVENT = "current-project-change";

function getSwitchedProjectPath(pathname, currentProjectId, nextProjectId) {
  const segments = pathname.split("/");
  const projectScope = segments[1] === "spaces" || segments[1] === "projects";
  if (!projectScope || segments[2] !== currentProjectId) return null;

  const nextSegments = [...segments];
  nextSegments[2] = nextProjectId;
  return nextSegments.join("/") || "/";
}

export function ProjectSwitcher({ compact = false, compactOnMobile = false, className, menuAlign = "right", menuPlacement = "down" }) {
  const navigate = useNavigate();
  const { pathname, search } = useLocation();
  const routeProjectId = pathname.match(/^\/(?:projects|spaces)\/([^/]+)/)?.[1];
  const [storedProjectId, setStoredProjectId] = useState(() => migrateStorageKey(LEGACY_STORAGE_KEYS.currentProjectId, CURRENT_PROJECT_KEY) || "");
  const [open, setOpen] = useState(false);
  const switcherRef = useRef(null);
  const currentProjectId = routeProjectId || storedProjectId;

  const projectsQuery = useApiResource(() => getProjects({ fields: "switcher", page: 1, limit: PAGE_SIZE }), [open, currentProjectId], {
    enabled: open || !currentProjectId,
    refreshEvents: ["projects"],
  });
  const projects = useMemo(() => projectsQuery.data?.data || [], [projectsQuery.data]);
  const resolvedProjectId = currentProjectId || projects[0]?.id || "";
  const listedProject = projects.find((project) => project.id === resolvedProjectId);
  const projectQuery = useApiResource(() => getProject(resolvedProjectId, { fields: "switcher" }), [resolvedProjectId, listedProject], {
    enabled: Boolean((open || routeProjectId) && resolvedProjectId && !projectsQuery.isLoading && !listedProject),
  });
  const currentProject = listedProject || projectQuery.data?.data;

  useEffect(() => {
    if (!routeProjectId) return;
    localStorage.setItem(CURRENT_PROJECT_KEY, routeProjectId);
    setStoredProjectId(routeProjectId);
    window.dispatchEvent(new CustomEvent(CURRENT_PROJECT_CHANGE_EVENT, { detail: routeProjectId }));
  }, [routeProjectId]);

  useEffect(() => {
    if (currentProjectId || !projects[0]?.id) return;
    localStorage.setItem(CURRENT_PROJECT_KEY, projects[0].id);
    setStoredProjectId(projects[0].id);
    window.dispatchEvent(new CustomEvent(CURRENT_PROJECT_CHANGE_EVENT, { detail: projects[0].id }));
  }, [currentProjectId, projects]);

  useEffect(() => {
    function handleProjectChange(event) {
      setStoredProjectId(event.detail || localStorage.getItem(CURRENT_PROJECT_KEY) || "");
    }

    window.addEventListener(CURRENT_PROJECT_CHANGE_EVENT, handleProjectChange);
    return () => window.removeEventListener(CURRENT_PROJECT_CHANGE_EVENT, handleProjectChange);
  }, []);

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
    setStoredProjectId(nextProjectId);
    window.dispatchEvent(new CustomEvent(CURRENT_PROJECT_CHANGE_EVENT, { detail: nextProjectId }));
    setOpen(false);

    if (routeProjectId) {
      const nextPath = getSwitchedProjectPath(pathname, routeProjectId, nextProjectId);
      if (nextPath && nextPath !== pathname) {
        navigate(`${nextPath}${search}`);
      }
    }
  }

  const projectInitials = currentProject?.key?.slice(0, 2).toUpperCase() || currentProject?.name?.slice(0, 2).toUpperCase() || "SP";
  const projectLabel = currentProject?.name || (projectsQuery.isLoading || projectQuery.isLoading ? "Loading spaces..." : "Select space");

  return (
    <div className={cn("relative", className)} ref={switcherRef}>
      <button
        type="button"
        className={cn(
          "flex h-9 w-full min-w-0 items-center rounded-md border border-border bg-transparent text-left shadow-none transition-colors hover:bg-accent",
          compact
            ? "justify-center p-1"
            : compactOnMobile
              ? "justify-center p-1 sm:justify-start sm:gap-2 sm:px-2.5"
              : "gap-2 px-2.5"
        )}
        aria-label="Switch project"
        aria-expanded={open}
        aria-haspopup="menu"
        title={compact || compactOnMobile ? projectLabel : undefined}
        onClick={() => setOpen((current) => !current)}
      >
        <span className="flex h-6 w-6 shrink-0 items-center justify-center rounded border bg-background text-[10px] font-bold text-primary">
          {projectInitials}
        </span>
        {!compact ? (
          <>
            <span className={cn("min-w-0 flex-1", compactOnMobile && "hidden sm:block")}>
              <span className="block truncate text-sm font-medium">{projectLabel}</span>
            </span>
            <ChevronDown
              className={cn(
                "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
                compactOnMobile && "hidden sm:block",
                open && "rotate-180"
              )}
            />
          </>
        ) : null}
      </button>

      {open ? (
        <div
          className={cn(
            "absolute z-50 w-72 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg",
            menuPlacement === "down" ? "top-full mt-2" : "bottom-full mb-2",
            menuAlign === "right" ? "right-0" : "left-0"
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
