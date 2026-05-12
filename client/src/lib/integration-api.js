import { api } from "@/lib/api";

export function getIntegrations(projectId, params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return api(`/projects/${projectId}/integrations${query.toString() ? `?${query}` : ""}`);
}

export function createIntegration(projectId, payload) {
  return api(`/projects/${projectId}/integrations`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updateIntegration(projectId, id, payload) {
  return api(`/projects/${projectId}/integrations/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function startGitHubOAuth(projectId) {
  return api(`/github/oauth/start?projectId=${encodeURIComponent(projectId)}`);
}

export function syncGitHubRepository(projectId, integrationId) {
  return api(`/projects/${projectId}/integrations/${integrationId}/sync-github`, {
    method: "POST",
  });
}
