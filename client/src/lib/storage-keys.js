export const STORAGE_KEYS = {
  currentProjectId: "currentProjectId",
  recentSearches: "recentSearches",
  theme: "theme",
};

export const LEGACY_STORAGE_KEYS = {
  currentProjectId: "zuzuplan.currentProjectId",
  recentNavigation: "zuzuplan.recentNavigation",
  recentSearches: "zuzuplan.recentSearches",
  theme: "zuzuplan-theme",
};

export function migrateStorageKey(legacyKey, nextKey) {
  if (typeof window === "undefined") return null;
  const nextValue = window.localStorage.getItem(nextKey);
  const legacyValue = window.localStorage.getItem(legacyKey);
  if (nextValue === null && legacyValue !== null) {
    window.localStorage.setItem(nextKey, legacyValue);
  }
  if (legacyValue !== null) {
    window.localStorage.removeItem(legacyKey);
  }
  return window.localStorage.getItem(nextKey);
}

export function cleanupLegacyStorage() {
  if (typeof window === "undefined") return;
  window.localStorage.removeItem("recentNavigation");
  Object.values(LEGACY_STORAGE_KEYS).forEach((key) => window.localStorage.removeItem(key));
}
