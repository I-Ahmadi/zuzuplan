import { createContext, lazy, Suspense, useCallback, useContext, useMemo, useState } from "react";

const GlobalSearchDialog = lazy(() => import("@/features/search/components/global-search-dialog"));

const SearchContext = createContext(undefined);

export function SearchProvider({ children }) {
  const [open, setOpen] = useState(false);
  const [initialQuery, setInitialQuery] = useState("");

  const openSearch = useCallback((query = "") => {
    setInitialQuery(query);
    setOpen(true);
  }, []);

  const closeSearch = useCallback(() => setOpen(false), []);

  const value = useMemo(() => ({ openSearch, closeSearch }), [openSearch, closeSearch]);

  return (
    <SearchContext.Provider value={value}>
      {children}
      {open ? (
        <Suspense fallback={null}>
          <GlobalSearchDialog open={open} initialQuery={initialQuery} onClose={closeSearch} />
        </Suspense>
      ) : null}
    </SearchContext.Provider>
  );
}

export function useGlobalSearch() {
  const context = useContext(SearchContext);

  if (!context) {
    throw new Error("useGlobalSearch must be used inside SearchProvider");
  }

  return context;
}
