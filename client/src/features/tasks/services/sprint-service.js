import { api } from "@/services/api-client";
import { normalizeTaskStatusPayload } from "@/features/tasks/constants/task-constants";

function normalizeSprint(sprint) {
  if (!sprint?.tasks) return sprint;
  return { ...sprint, tasks: sprint.tasks.map(normalizeTaskStatusPayload) };
}

function normalizeSprintResult(result) {
  if (!result?.success) return result;
  if (Array.isArray(result.data)) {
    return { ...result, data: result.data.map(normalizeSprint) };
  }
  return { ...result, data: normalizeSprint(result.data) };
}

export async function getProjectSprints(projectId) {
  return normalizeSprintResult(await api(`/projects/${projectId}/sprints`));
}

export async function getProjectSprintTasks(projectId, sprintId) {
  const result = await api(`/projects/${projectId}/sprints/${sprintId}/tasks`);
  if (!result?.success || !Array.isArray(result.data)) return result;
  return { ...result, data: result.data.map(normalizeTaskStatusPayload) };
}

export async function createSprint(projectId, payload) {
  return normalizeSprintResult(await api(`/projects/${projectId}/sprints`, {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function updateSprint(projectId, sprintId, payload) {
  return normalizeSprintResult(await api(`/projects/${projectId}/sprints/${sprintId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }));
}

export async function startSprint(projectId, sprintId, payload) {
  return normalizeSprintResult(await api(`/projects/${projectId}/sprints/${sprintId}/start`, {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function completeSprint(projectId, sprintId, payload = { moveOpenToBacklog: true }) {
  return normalizeSprintResult(await api(`/projects/${projectId}/sprints/${sprintId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function deleteSprint(projectId, sprintId) {
  return api(`/projects/${projectId}/sprints/${sprintId}`, {
    method: "DELETE",
  });
}

export async function addTasksToSprint(projectId, sprintId, taskIds) {
  return normalizeSprintResult(await api(`/projects/${projectId}/sprints/${sprintId}/tasks`, {
    method: "POST",
    body: JSON.stringify({ taskIds }),
  }));
}

export async function removeTaskFromSprint(projectId, sprintId, taskId) {
  return normalizeSprintResult(await api(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`, {
    method: "DELETE",
  }));
}

export async function reorderSprintTasks(projectId, sprintId, orderedTaskIds) {
  return api(`/projects/${projectId}/sprints/${sprintId}/tasks/reorder`, {
    method: "PUT",
    body: JSON.stringify({ orderedTaskIds }),
  });
}
