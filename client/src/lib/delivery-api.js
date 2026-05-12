import { api } from "@/lib/api";

function queryString(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return query.toString();
}

function projectPath(projectId, area, params) {
  const query = queryString(params);
  return `/projects/${projectId}/delivery/${area}${query ? `?${query}` : ""}`;
}

export function getPullRequests(projectId, params = {}) {
  return api(projectPath(projectId, "pull-requests", params));
}

export function createPullRequest(projectId, payload) {
  return api(`/projects/${projectId}/delivery/pull-requests`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function updatePullRequest(projectId, id, payload) {
  return api(`/projects/${projectId}/delivery/pull-requests/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function getDeployments(projectId, params = {}) {
  return api(projectPath(projectId, "deployments", params));
}

export function createDeployment(projectId, payload) {
  return api(`/projects/${projectId}/delivery/deployments`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export function getReleases(projectId, params = {}) {
  return api(projectPath(projectId, "releases", params));
}

export function createRelease(projectId, payload) {
  return api(`/projects/${projectId}/delivery/releases`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}
