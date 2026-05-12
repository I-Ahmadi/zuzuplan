import { useEffect, useRef, useState } from "react";
import { Link, useLocation } from "react-router-dom";
import { Bell, ChevronDown, Github, Inbox, ScrollText, Search } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useGlobalSearch } from "@/contexts/search-context";
import { cn } from "@/lib/utils";

const UTILITY_PANELS = {
  inbox: {
    label: "Inbox",
    icon: Inbox,
    to: "/inbox",
    action: "View all inbox",
    title: "Engineering inbox",
    description: "Actionable work that needs your attention.",
    items: [
      { title: "Assigned work", description: "Issues assigned to you, due soon, or recently changed." },
      { title: "Review requests", description: "Pull request and review items will appear here after integrations." },
      { title: "Blockers", description: "Blocked issues, failed checks, and deployment issues belong here." },
    ],
  },
  notifications: {
    label: "Notifications",
    icon: Bell,
    to: "/notifications",
    action: "View all notifications",
    title: "Notifications",
    description: "Team updates and engineering activity signals.",
    items: [
      { title: "Mentions and comments", description: "Replies, mentions, and discussion updates." },
      { title: "Assignment changes", description: "Issue ownership and priority changes." },
      { title: "Delivery updates", description: "Build, deployment, and release events will appear here." },
    ],
  },
  releases: {
    label: "Release notes",
    icon: ScrollText,
    to: "/release-notes",
    action: "View release notes",
    title: "Release notes",
    description: "Product changes, fixes, and rollout notes.",
    items: [
      { title: "Product updates", description: "New features and workflow improvements." },
      { title: "Fixes", description: "Resolved bugs and polish work." },
      { title: "Integration changes", description: "Git, deployment, and platform updates will be tracked here." },
    ],
  },
};

export default function Header() {
  const { openSearch } = useGlobalSearch();
  const { search } = useLocation();
  const [openUtility, setOpenUtility] = useState(null);
  const [searchValue, setSearchValue] = useState(() => new URLSearchParams(search).get("q") || "");
  const utilityRef = useRef(null);

  useEffect(() => {
    function closeUtility(event) {
      if (event.key === "Escape") setOpenUtility(null);
    }

    document.addEventListener("keydown", closeUtility);
    return () => document.removeEventListener("keydown", closeUtility);
  }, []);

  useEffect(() => {
    function closeOnOutsideClick(event) {
      if (!utilityRef.current?.contains(event.target)) setOpenUtility(null);
    }

    document.addEventListener("mousedown", closeOnOutsideClick);
    return () => document.removeEventListener("mousedown", closeOnOutsideClick);
  }, []);

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
            placeholder="Search issues, spaces, docs..."
            type="search"
          />
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 lg:hidden" aria-label="Search" onClick={() => openSearch()}>
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <div className="hidden lg:block" />

        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9" aria-label="GitHub" title="GitHub" asChild>
            <Link to="/github">
              <Github className="h-4 w-4" />
            </Link>
          </Button>
          <div className="relative flex items-center gap-1.5" ref={utilityRef}>
            {Object.entries(UTILITY_PANELS).map(([key, panel]) => {
              const Icon = panel.icon;
              const active = openUtility === key;
              return (
                <Button
                  key={key}
                  type="button"
                  variant="ghost"
                  size="icon"
                  className={cn("h-9 w-9", active && "bg-accent text-accent-foreground")}
                  aria-label={panel.label}
                  aria-expanded={active}
                  aria-haspopup="dialog"
                  title={panel.label}
                  onClick={() => {
                    setOpenUtility((current) => (current === key ? null : key));
                  }}
                >
                  <Icon className="h-4 w-4" />
                </Button>
              );
            })}

            {openUtility ? (
              <div
                className="absolute right-0 top-10 z-50 w-[min(22rem,calc(100vw-1.5rem))] overflow-hidden rounded-md border bg-popover text-popover-foreground shadow-lg"
                role="dialog"
                aria-label={UTILITY_PANELS[openUtility].title}
              >
                <div className="border-b px-3 py-3">
                  <p className="text-sm font-semibold">{UTILITY_PANELS[openUtility].title}</p>
                  <p className="mt-1 text-xs text-muted-foreground">{UTILITY_PANELS[openUtility].description}</p>
                </div>
                <div className="p-1">
                  {UTILITY_PANELS[openUtility].items.map((item) => (
                    <div key={item.title} className="rounded px-2 py-2">
                      <p className="text-sm font-medium">{item.title}</p>
                      <p className="mt-0.5 text-xs leading-5 text-muted-foreground">{item.description}</p>
                    </div>
                  ))}
                </div>
                <div className="border-t p-1">
                  <Link
                    className="flex h-9 items-center justify-between rounded px-2 text-sm font-medium text-primary hover:bg-accent"
                    to={UTILITY_PANELS[openUtility].to}
                    onClick={() => setOpenUtility(null)}
                  >
                    {UTILITY_PANELS[openUtility].action}
                    <ChevronDown className="h-4 w-4 -rotate-90" />
                  </Link>
                </div>
              </div>
            ) : null}
          </div>
        </div>
      </div>
    </header>
  );
}
