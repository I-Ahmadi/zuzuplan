import { api } from "@/lib/api";

export async function getProjects(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return api(`/projects${query ? `?${query}` : ""}`);
}

export async function getProject(projectId) {
  return api(`/projects/${projectId}`);
}

export async function createProject(payload) {
  return api("/projects", {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProject(projectId, payload) {
  return api(`/projects/${projectId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteProject(projectId) {
  return api(`/projects/${projectId}`, {
    method: "DELETE",
  });
}

export async function getProjectMembers(projectId) {
  return api(`/projects/${projectId}/members`);
}

export async function addProjectMember(projectId, payload) {
  return api(`/projects/${projectId}/members`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateProjectMember(projectId, userId, payload) {
  return api(`/projects/${projectId}/members/${userId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function removeProjectMember(projectId, userId) {
  return api(`/projects/${projectId}/members/${userId}`, {
    method: "DELETE",
  });
}

export async function getProjectInvites(projectId) {
  return api(`/projects/${projectId}/invites`);
}

export async function createProjectInvite(projectId, payload) {
  return api(`/projects/${projectId}/invites`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function revokeProjectInvite(projectId, inviteId) {
  return api(`/projects/${projectId}/invites/${inviteId}`, {
    method: "DELETE",
  });
}

export async function getProjectInvite(token) {
  return api(`/projects/invites/${token}`);
}

export async function acceptProjectInvite(token) {
  return api(`/projects/invites/${token}/accept`, {
    method: "POST",
  });
}
