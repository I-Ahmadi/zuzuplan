import { api } from "@/lib/api";

export async function getProjectSprints(projectId) {
  return api(`/projects/${projectId}/sprints`);
}

export async function createSprint(projectId, payload) {
  return api(`/projects/${projectId}/sprints`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateSprint(projectId, sprintId, payload) {
  return api(`/projects/${projectId}/sprints/${sprintId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function startSprint(projectId, sprintId, payload) {
  return api(`/projects/${projectId}/sprints/${sprintId}/start`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function completeSprint(projectId, sprintId, payload = { moveOpenToBacklog: true }) {
  return api(`/projects/${projectId}/sprints/${sprintId}/complete`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function deleteSprint(projectId, sprintId) {
  return api(`/projects/${projectId}/sprints/${sprintId}`, {
    method: "DELETE",
  });
}

export async function addTasksToSprint(projectId, sprintId, taskIds) {
  return api(`/projects/${projectId}/sprints/${sprintId}/tasks`, {
    method: "POST",
    body: JSON.stringify({ taskIds }),
  });
}

export async function removeTaskFromSprint(projectId, sprintId, taskId) {
  return api(`/projects/${projectId}/sprints/${sprintId}/tasks/${taskId}`, {
    method: "DELETE",
  });
}

export async function reorderSprintTasks(projectId, sprintId, orderedTaskIds) {
  return api(`/projects/${projectId}/sprints/${sprintId}/tasks/reorder`, {
    method: "PUT",
    body: JSON.stringify({ orderedTaskIds }),
  });
}
