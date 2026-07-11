import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { TASK_STATUSES, makeTaskStatus, mergeTaskStatuses } from "@/features/tasks/constants/task-constants";

const TaskStatusesContext = createContext({
  statuses: TASK_STATUSES,
  addStatus: () => null,
});

const CUSTOM_STATUS_STORAGE_PREFIX = "sprintly.task-statuses.";

function statusStorageKey(projectId) {
  return `${CUSTOM_STATUS_STORAGE_PREFIX}${projectId || "global"}`;
}

function readCustomStatuses(projectId) {
  if (typeof window === "undefined" || !projectId) return [];
  try {
    const parsed = JSON.parse(window.localStorage.getItem(statusStorageKey(projectId)) || "[]");
    return Array.isArray(parsed) ? parsed.filter((status) => status?.value && status?.label) : [];
  } catch {
    return [];
  }
}

function writeCustomStatuses(projectId, statuses) {
  if (typeof window === "undefined" || !projectId) return;
  window.localStorage.setItem(statusStorageKey(projectId), JSON.stringify(statuses));
}

export function useProjectTaskStatuses(projectId) {
  const [customStatuses, setCustomStatuses] = useState(() => readCustomStatuses(projectId));

  useEffect(() => {
    setCustomStatuses(readCustomStatuses(projectId));
  }, [projectId]);

  const statuses = useMemo(() => mergeTaskStatuses(customStatuses), [customStatuses]);

  function addStatus(label) {
    const nextStatus = makeTaskStatus(label, statuses);
    if (!nextStatus || !projectId) return null;
    const nextCustomStatuses = [...customStatuses, nextStatus];
    setCustomStatuses(nextCustomStatuses);
    writeCustomStatuses(projectId, nextCustomStatuses);
    return nextStatus;
  }

  return { statuses, addStatus };
}

export function useTaskStatuses() {
  return useContext(TaskStatusesContext);
}

export function TaskStatusesProvider({ value, children }) {
  return (
    <TaskStatusesContext.Provider value={value}>
      {children}
    </TaskStatusesContext.Provider>
  );
}
