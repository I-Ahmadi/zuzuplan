import { api } from "@/lib/api";

export async function getProjectTasks(projectId, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return api(`/projects/${projectId}/tasks${query ? `?${query}` : ""}`);
}

export async function createTask(projectId, payload) {
  return api(`/projects/${projectId}/tasks`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function getTask(projectId, taskId) {
  return api(`/projects/${projectId}/tasks/${taskId}`);
}

export async function updateTask(projectId, taskId, payload) {
  return api(`/projects/${projectId}/tasks/${taskId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteTask(projectId, taskId) {
  return api(`/projects/${projectId}/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export async function addTaskLink(projectId, taskId, payload) {
  return api(`/projects/${projectId}/tasks/${taskId}/links`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteTaskLink(projectId, taskId, linkId) {
  return api(`/projects/${projectId}/tasks/${taskId}/links/${linkId}`, {
    method: "DELETE",
  });
}
