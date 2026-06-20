import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import { Search } from "lucide-react";
import { ProjectSwitcher } from "@/components/board/project-switcher";
import { Button } from "@/components/ui/button";
import { useGlobalSearch } from "@/contexts/search-context";

export default function Header() {
  const { openSearch } = useGlobalSearch();
  const { search } = useLocation();
  const [searchValue, setSearchValue] = useState(() => new URLSearchParams(search).get("q") || "");

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
      <div className="grid h-full w-full grid-cols-[auto_minmax(0,1fr)] items-center gap-3 px-3 sm:px-4 lg:grid-cols-[minmax(260px,560px)_minmax(0,1fr)_auto] lg:px-5">
        <form className="relative min-w-0 justify-self-start lg:w-full" onSubmit={submitSearch}>
          <Search className="pointer-events-none absolute left-2.5 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <input
            className="hidden h-9 w-full rounded-md border bg-background pl-8 pr-3 text-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-ring focus:ring-1 focus:ring-ring lg:block"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            onFocus={() => openSearch(searchValue)}
            placeholder="Search issues, spaces, comments..."
            type="search"
          />
          <Button type="button" variant="ghost" size="icon" className="h-9 w-9 lg:hidden" aria-label="Search" onClick={() => openSearch()}>
            <Search className="h-4 w-4" />
          </Button>
        </form>

        <div className="hidden lg:block" />

        <div className="flex min-w-0 items-center justify-end gap-1.5">
          <ProjectSwitcher compact className="w-9 sm:hidden" />
          <ProjectSwitcher className="hidden w-56 sm:block" />
        </div>
      </div>
    </header>
  );
}
