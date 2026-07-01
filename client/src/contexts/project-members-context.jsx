import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { useAuth } from "@/contexts/auth-context";
import { getProjectMembers, getProjects } from "@/lib/project-api";
import { LEGACY_STORAGE_KEYS, migrateStorageKey, STORAGE_KEYS } from "@/lib/storage-keys";

const ProjectMembersContext = createContext(undefined);
const CURRENT_PROJECT_KEY = STORAGE_KEYS.currentProjectId;
const CURRENT_PROJECT_CHANGE_EVENT = "current-project-change";
const membersCache = new Map();
const membersRequests = new Map();

function getProjectIdFromPath() {
  if (typeof window === "undefined") return "";
  return window.location.pathname.match(/^\/(?:projects|spaces)\/([^/]+)/)?.[1] || "";
}

function getInitialProjectId() {
  return getProjectIdFromPath() || migrateStorageKey(LEGACY_STORAGE_KEYS.currentProjectId, CURRENT_PROJECT_KEY) || "";
}

export function ProjectMembersProvider({ children }) {
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [currentProjectId, setCurrentProjectId] = useState(getInitialProjectId);
  const [membersByProjectId, setMembersByProjectId] = useState(() => new Map(membersCache));
  const [loadingByProjectId, setLoadingByProjectId] = useState({});
  const [errorByProjectId, setErrorByProjectId] = useState({});
  const mountedRef = useRef(true);
  const defaultProjectRequestRef = useRef(null);

  useEffect(() => {
    return () => {
      mountedRef.current = false;
    };
  }, []);

  useEffect(() => {
    if (isAuthenticated) return;
    membersCache.clear();
    membersRequests.clear();
    setMembersByProjectId(new Map());
    setLoadingByProjectId({});
    setErrorByProjectId({});
  }, [isAuthenticated]);

  useEffect(() => {
    function handleProjectChange(event) {
      const nextProjectId = event.detail || getProjectIdFromPath() || localStorage.getItem(CURRENT_PROJECT_KEY) || "";
      setCurrentProjectId(nextProjectId);
    }

    window.addEventListener(CURRENT_PROJECT_CHANGE_EVENT, handleProjectChange);
    window.addEventListener("popstate", handleProjectChange);
    return () => {
      window.removeEventListener(CURRENT_PROJECT_CHANGE_EVENT, handleProjectChange);
      window.removeEventListener("popstate", handleProjectChange);
    };
  }, []);

  useEffect(() => {
    if (authLoading || !isAuthenticated || currentProjectId || getProjectIdFromPath()) return;
    if (defaultProjectRequestRef.current) return;

    defaultProjectRequestRef.current = getProjects({ fields: "switcher", page: 1, limit: 1 })
      .then((result) => {
        if (!mountedRef.current || currentProjectId || getProjectIdFromPath() || localStorage.getItem(CURRENT_PROJECT_KEY)) return;

        const firstProjectId = result?.data?.[0]?.id;
        if (!firstProjectId) return;

        localStorage.setItem(CURRENT_PROJECT_KEY, firstProjectId);
        setCurrentProjectId(firstProjectId);
        window.dispatchEvent(new CustomEvent(CURRENT_PROJECT_CHANGE_EVENT, { detail: firstProjectId }));
      })
      .catch(() => null)
      .finally(() => {
        defaultProjectRequestRef.current = null;
      });
  }, [authLoading, currentProjectId, isAuthenticated]);

  const loadMembers = useCallback(async (projectId, { force = false } = {}) => {
    if (!projectId || !isAuthenticated) return null;
    if (!force && membersCache.has(projectId)) {
      setMembersByProjectId(new Map(membersCache));
      return { success: true, data: membersCache.get(projectId) };
    }
    if (!force && membersRequests.has(projectId)) return membersRequests.get(projectId);

    setLoadingByProjectId((current) => ({ ...current, [projectId]: true }));
    setErrorByProjectId((current) => ({ ...current, [projectId]: null }));

    const request = getProjectMembers(projectId)
      .then((result) => {
        if (result?.success) {
          membersCache.set(projectId, result.data || []);
          if (mountedRef.current) setMembersByProjectId(new Map(membersCache));
        } else if (mountedRef.current) {
          setErrorByProjectId((current) => ({ ...current, [projectId]: result?.error?.message || "Could not load members." }));
        }
        return result;
      })
      .catch((error) => {
        if (mountedRef.current) {
          setErrorByProjectId((current) => ({ ...current, [projectId]: error.message || "Could not load members." }));
        }
        return null;
      })
      .finally(() => {
        membersRequests.delete(projectId);
        if (mountedRef.current) {
          setLoadingByProjectId((current) => ({ ...current, [projectId]: false }));
        }
      });

    membersRequests.set(projectId, request);
    return request;
  }, [isAuthenticated]);

  useEffect(() => {
    if (!currentProjectId || !isAuthenticated) return;
    loadMembers(currentProjectId);
  }, [currentProjectId, isAuthenticated, loadMembers]);

  const value = useMemo(() => ({
    currentProjectId,
    membersByProjectId,
    getMembers(projectId = currentProjectId) {
      return membersByProjectId.get(projectId) || [];
    },
    isLoading(projectId = currentProjectId) {
      return Boolean(loadingByProjectId[projectId]);
    },
    getError(projectId = currentProjectId) {
      return errorByProjectId[projectId] || null;
    },
    refreshMembers(projectId = currentProjectId) {
      return loadMembers(projectId, { force: true });
    },
    ensureMembers(projectId = currentProjectId) {
      if (!projectId || membersByProjectId.has(projectId) || loadingByProjectId[projectId] || errorByProjectId[projectId]) return null;
      return loadMembers(projectId);
    },
  }), [currentProjectId, errorByProjectId, loadMembers, loadingByProjectId, membersByProjectId]);

  return <ProjectMembersContext.Provider value={value}>{children}</ProjectMembersContext.Provider>;
}

export function useProjectMembers(projectId) {
  const context = useContext(ProjectMembersContext);
  if (!context) throw new Error("useProjectMembers must be used inside ProjectMembersProvider");
  const resolvedProjectId = projectId || context.currentProjectId;

  useEffect(() => {
    context.ensureMembers(resolvedProjectId);
  }, [context, resolvedProjectId]);

  return {
    members: context.getMembers(resolvedProjectId),
    isLoading: context.isLoading(resolvedProjectId),
    error: context.getError(resolvedProjectId),
    refreshMembers: () => context.refreshMembers(resolvedProjectId),
  };
}
