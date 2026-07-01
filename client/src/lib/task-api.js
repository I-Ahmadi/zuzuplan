import { api } from "@/lib/api";
import { normalizeTaskStatusPayload } from "@/lib/issue-constants";

function normalizeTaskResult(result) {
  if (!result?.success) return result;
  if (Array.isArray(result.data)) {
    return { ...result, data: result.data.map(normalizeTaskStatusPayload) };
  }
  return { ...result, data: normalizeTaskStatusPayload(result.data) };
}

function normalizeTimelineResult(result) {
  if (!result?.success || !result.data) return result;
  const tasks = Array.isArray(result.data.tasks) ? result.data.tasks.map(normalizeTaskStatusPayload) : [];
  const scheduledTasks = Array.isArray(result.data.scheduledTasks)
    ? result.data.scheduledTasks.map(normalizeTaskStatusPayload)
    : [];
  const tasksBySprint = Object.fromEntries(
    Object.entries(result.data.tasksBySprint || {}).map(([sprintId, tasks]) => [
      sprintId,
      Array.isArray(tasks) ? tasks.map(normalizeTaskStatusPayload) : [],
    ])
  );

  return {
    ...result,
    data: {
      ...result.data,
      tasks,
      scheduledTasks,
      tasksBySprint,
    },
  };
}

export async function getProjectBacklogTasks(projectId, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return normalizeTaskResult(await api(`/projects/${projectId}/backlog${query ? `?${query}` : ""}`));
}

export async function getProjectListTasks(projectId, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return normalizeTaskResult(await api(`/projects/${projectId}/list${query ? `?${query}` : ""}`));
}

export async function getProjectBoardTasks(projectId, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return normalizeTaskResult(await api(`/projects/${projectId}/board${query ? `?${query}` : ""}`));
}

export async function getProjectTimeline(projectId, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return normalizeTimelineResult(await api(`/projects/${projectId}/timeline${query ? `?${query}` : ""}`));
}

export async function getProjectTaskSummary(projectId) {
  return api(`/projects/${projectId}/issues/summary`);
}

export async function getProjectTaskWorkload(projectId) {
  return api(`/projects/${projectId}/issues/workload`);
}

export async function createTask(projectId, payload) {
  return normalizeTaskResult(await api(`/projects/${projectId}/issues`, {
    method: "POST",
    body: JSON.stringify(payload),
  }));
}

export async function getTask(projectId, taskId) {
  return normalizeTaskResult(await api(`/projects/${projectId}/issues/${taskId}`));
}

export async function updateTask(projectId, taskId, payload) {
  return normalizeTaskResult(await api(`/projects/${projectId}/issues/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  }));
}

export async function deleteTask(projectId, taskId) {
  return api(`/projects/${projectId}/issues/${taskId}`, {
    method: "DELETE",
  });
}

