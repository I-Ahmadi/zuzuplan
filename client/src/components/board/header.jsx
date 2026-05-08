import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useLocation, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Check, ChevronDown, FolderKanban, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PAGE_SIZE } from "@/components/ui/pagination";
import { useGlobalSearch } from "@/contexts/search-context";
import { getProject, getProjects } from "@/lib/project-api";
import { LEGACY_STORAGE_KEYS, migrateStorageKey, STORAGE_KEYS } from "@/lib/storage-keys";
import { cn } from "@/lib/utils";

const CURRENT_PROJECT_KEY = STORAGE_KEYS.currentProjectId;
const CURRENT_PROJECT_CHANGE_EVENT = "current-project-change";

export default function Header() {
  const { openSearch } = useGlobalSearch();
  const { pathname, search } = useLocation();
  const navigate = useNavigate();
  const [open, setOpen] = useState(false);
  const [searchValue, setSearchValue] = useState(() => new URLSearchParams(search).get("q") || "");
  const dropdownRef = useRef(null);
  const projectId = pathname.match(/^\/(?:projects|spaces)\/([^/]+)/)?.[1];
  const [storedProjectId, setStoredProjectId] = useState(() => migrateStorageKey(LEGACY_STORAGE_KEYS.currentProjectId, CURRENT_PROJECT_KEY) || "");
  const projectsQuery = useQuery({
    queryKey: ["projects", "header-switcher"],
    queryFn: () => getProjects({ limit: PAGE_SIZE }),
    staleTime: 60 * 1000,
  });
  const projects = useMemo(() => projectsQuery.data?.data || [], [projectsQuery.data]);
  const currentProjectId = projectId || storedProjectId || projects[0]?.id || "";
  const projectQuery = useQuery({
    queryKey: ["header-project", currentProjectId],
    queryFn: () => getProject(currentProjectId),
    enabled: Boolean(currentProjectId),
    staleTime: 60 * 1000,
  });
  const currentProject = projectQuery.data?.data || projects.find((project) => project.id === currentProjectId);

  useEffect(() => {
    if (!projectId) return;
    localStorage.setItem(CURRENT_PROJECT_KEY, projectId);
    setStoredProjectId(projectId);
  }, [projectId]);

  useEffect(() => {
    if (storedProjectId || !projects[0]?.id) return;
    localStorage.setItem(CURRENT_PROJECT_KEY, projects[0].id);
    setStoredProjectId(projects[0].id);
  }, [projects, storedProjectId]);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!dropdownRef.current?.contains(event.target)) setOpen(false);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

  function switchProject(nextProjectId) {
    localStorage.setItem(CURRENT_PROJECT_KEY, nextProjectId);
    setStoredProjectId(nextProjectId);
    window.dispatchEvent(new CustomEvent(CURRENT_PROJECT_CHANGE_EVENT, { detail: nextProjectId }));
    setOpen(false);
    if (projectId) {
      navigate(`${pathname.replace(projectId, nextProjectId)}${search}`);
    }
  }

  function submitSearch(event) {
    event.preventDefault();
    openSearch(searchValue);
  }

  useEffect(() => {
    function handleShortcut(event) {
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        openSearch();
      }
    }

    document.addEventListener("keydown", handleShortcut);
    return () => document.removeEventListener("keydown", handleShortcut);
  }, [openSearch]);

  return (
    <header className="sticky top-0 z-30 h-14 border-b bg-topbar">
      <div className="grid h-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3 lg:grid-cols-[minmax(260px,560px)_minmax(0,1fr)_auto]">
        <form className="relative min-w-0 justify-self-start lg:w-full" onSubmit={submitSearch}>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="hidden h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring lg:block"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onFocus={() => openSearch(searchValue)}
            placeholder="Search spaces, tasks, docs..."
            type="search"
          />
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 lg:hidden" aria-label="Search" onClick={() => openSearch()}>
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <div className="hidden lg:block" />

        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <div className="relative min-w-0" ref={dropdownRef}>
          {currentProject ? (
            <>
              <button
                type="button"
                className="flex h-9 max-w-[min(34vw,260px)] items-center gap-2 rounded-md px-2 text-left transition-colors hover:bg-accent"
                onClick={() => setOpen((current) => !current)}
                aria-expanded={open}
                aria-haspopup="menu"
              >
                <FolderKanban className="h-4 w-4 shrink-0 text-muted-foreground" />
                <span className="hidden min-w-0 truncate text-sm font-medium tracking-normal text-foreground sm:block">{currentProject.name}</span>
                <span className="flex h-7 min-w-10 shrink-0 items-center justify-center rounded border bg-background px-2 text-xs font-medium text-muted-foreground shadow-sm">
                  {(currentProject.key || "ZP").slice(0, 3).toUpperCase()}
                </span>
                <ChevronDown className={cn("h-3.5 w-3.5 shrink-0 text-muted-foreground transition-transform", open && "rotate-180")} />
              </button>
              {open ? (
                <div className="absolute right-0 top-10 z-50 w-72 overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg" role="menu">
                  <div className="border-b px-3 py-2">
                    <p className="text-xs font-medium uppercase text-muted-foreground">Switch project</p>
                  </div>
                  <div className="max-h-80 overflow-y-auto p-1">
                    {projects.map((project) => {
                      const active = project.id === currentProject.id;
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
                            {project.key?.slice(0, 2).toUpperCase() || "ZP"}
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
            </>
          ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
