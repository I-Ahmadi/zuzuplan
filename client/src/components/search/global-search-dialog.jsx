import { useEffect, useMemo, useRef, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { FileText, FolderKanban, ListTodo, MessageSquare, Search, UserCircle, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { globalSearch } from "@/lib/search-api";
import { LEGACY_STORAGE_KEYS, migrateStorageKey, STORAGE_KEYS } from "@/lib/storage-keys";
import { cn } from "@/lib/utils";

const RECENT_SEARCHES_KEY = STORAGE_KEYS.recentSearches;

function readRecentSearches() {
  try {
    migrateStorageKey(LEGACY_STORAGE_KEYS.recentSearches, RECENT_SEARCHES_KEY);
    return JSON.parse(localStorage.getItem(RECENT_SEARCHES_KEY) || "[]");
  } catch {
    return [];
  }
}

function saveRecentSearch(query) {
  const value = query.trim();
  if (!value) return;
  const next = [value, ...readRecentSearches().filter((item) => item !== value)].slice(0, 6);
  localStorage.setItem(RECENT_SEARCHES_KEY, JSON.stringify(next));
}

function useDebouncedValue(value, delay = 220) {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delay);
    return () => window.clearTimeout(timer);
  }, [delay, value]);

  return debounced;
}

function resultPath(result) {
  if (result.type === "space") return `/spaces/${result.item.id}`;
  if (result.type === "task") return `/spaces/${result.item.projectId}/tasks/${result.item.id}`;
  if (result.type === "doc") return `/spaces/${result.item.projectId}/tasks?view=docs`;
  if (result.type === "comment") return `/spaces/${result.item.task.projectId}/tasks/${result.item.taskId}`;
  return "/team-members";
}

function ResultIcon({ type }) {
  const icons = {
    space: FolderKanban,
    task: ListTodo,
    doc: FileText,
    comment: MessageSquare,
    member: UserCircle,
  };
  const Icon = icons[type] || Search;
  return <Icon className="h-4 w-4" />;
}

function resultSubtitle(result) {
  const item = result.item;
  if (result.type === "space") return `${item.key || "SP"} - ${item.status || "active"}`;
  if (result.type === "task") return `${item.project?.key || "SP"} - ${item.status}`;
  if (result.type === "doc") return item.project?.name || "Document";
  if (result.type === "comment") return `${item.user?.name || item.user?.email || "Comment"} on ${item.task?.title || "task"}`;
  return `${item.role || "Member"} - ${item.project?.name || "Team"}`;
}

function flattenResults(results) {
  return [
    ...(results.projects || []).map((item) => ({ type: "space", title: item.name, item })),
    ...(results.tasks || []).map((item) => ({ type: "task", title: item.title, item })),
    ...(results.docs || []).map((item) => ({ type: "doc", title: item.title, item })),
    ...(results.comments || []).map((item) => ({ type: "comment", title: item.content, item })),
    ...(results.members || []).map((item) => ({ type: "member", title: item.user?.name || item.user?.email || "Member", item })),
  ];
}

export default function GlobalSearchDialog({ open, initialQuery, onClose }) {
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const [recentSearches, setRecentSearches] = useState([]);
  const debouncedQuery = useDebouncedValue(query);
  const trimmedQuery = debouncedQuery.trim();

  const searchQuery = useQuery({
    queryKey: ["global-search-dialog", trimmedQuery],
    queryFn: () => globalSearch(trimmedQuery),
    enabled: open && trimmedQuery.length >= 2,
  });

  const results = useMemo(() => {
    return flattenResults(searchQuery.data?.data || { projects: [], tasks: [], docs: [], comments: [], members: [] });
  }, [searchQuery.data]);

  useEffect(() => {
    if (!open) return;
    setQuery(initialQuery || "");
    setActiveIndex(0);
    setRecentSearches(readRecentSearches());
    window.setTimeout(() => inputRef.current?.focus(), 0);
  }, [initialQuery, open]);

  useEffect(() => {
    if (!open) return undefined;

    function handleKeyDown(event) {
      if (event.key === "Escape") onClose();
      if (event.key === "ArrowDown") {
        event.preventDefault();
        setActiveIndex((current) => Math.min(current + 1, Math.max(results.length - 1, 0)));
      }
      if (event.key === "ArrowUp") {
        event.preventDefault();
        setActiveIndex((current) => Math.max(current - 1, 0));
      }
      if (event.key === "Enter" && results[activeIndex]) {
        event.preventDefault();
        openResult(results[activeIndex]);
      }
    }

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, [activeIndex, onClose, open, results]);

  if (!open) return null;

  function openResult(result) {
    saveRecentSearch(query);
    onClose();
    navigate(resultPath(result));
  }

  function useRecentSearch(value) {
    setQuery(value);
    setActiveIndex(0);
  }

  return (
    <div className="fixed inset-0 z-50 bg-black/35 p-3 backdrop-blur-sm" onMouseDown={onClose}>
      <div className="mx-auto mt-16 w-full max-w-2xl overflow-hidden rounded-lg border bg-background shadow-2xl" onMouseDown={(event) => event.stopPropagation()}>
        <div className="flex h-12 items-center gap-2 border-b px-3">
          <Search className="h-4 w-4 text-muted-foreground" />
          <input
            ref={inputRef}
            className="h-full min-w-0 flex-1 bg-transparent text-sm outline-none placeholder:text-muted-foreground"
            value={query}
            onChange={(event) => {
              setQuery(event.target.value);
              setActiveIndex(0);
            }}
            placeholder="Search tasks, spaces, docs, comments, people..."
            type="search"
          />
          <kbd className="hidden rounded border bg-secondary px-1.5 py-0.5 text-[11px] text-muted-foreground sm:inline">Esc</kbd>
          <Button variant="ghost" size="icon" className="h-8 w-8" aria-label="Close search" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>

        <div className="max-h-[70vh] overflow-y-auto p-2">
          {query.trim().length < 2 ? (
            <div className="space-y-2 p-2">
              <p className="px-1 text-xs font-semibold uppercase text-muted-foreground">Recent searches</p>
              {recentSearches.length ? (
                recentSearches.map((item) => (
                  <button key={item} className="flex w-full items-center gap-2 rounded-md px-2 py-2 text-left text-sm hover:bg-accent" onClick={() => useRecentSearch(item)}>
                    <Search className="h-4 w-4 text-muted-foreground" />
                    {item}
                  </button>
                ))
              ) : (
                <p className="px-2 py-6 text-center text-sm text-muted-foreground">No recent searches yet.</p>
              )}
            </div>
          ) : null}

          {query.trim().length >= 2 ? (
            <div className="space-y-1">
              {searchQuery.isFetching ? <p className="px-3 py-2 text-sm text-muted-foreground">Searching...</p> : null}
              {results.map((result, index) => (
                <button
                  key={`${result.type}-${result.item.id}`}
                  className={cn(
                    "flex w-full items-center gap-3 rounded-md px-3 py-2 text-left transition-colors",
                    index === activeIndex ? "bg-accent text-foreground" : "hover:bg-accent/70"
                  )}
                  onMouseEnter={() => setActiveIndex(index)}
                  onClick={() => openResult(result)}
                >
                  <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-secondary text-muted-foreground">
                    <ResultIcon type={result.type} />
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-sm font-medium">{result.title}</span>
                    <span className="block truncate text-xs text-muted-foreground">{resultSubtitle(result)}</span>
                  </span>
                  <span className="rounded bg-secondary px-1.5 py-0.5 text-[11px] capitalize text-muted-foreground">{result.type}</span>
                </button>
              ))}
              {!searchQuery.isFetching && !results.length ? (
                <p className="px-3 py-8 text-center text-sm text-muted-foreground">No results found.</p>
              ) : null}
            </div>
          ) : null}
        </div>
      </div>
    </div>
  );
}
