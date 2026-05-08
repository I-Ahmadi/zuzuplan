import { api } from "@/lib/api";

export async function getProjectDocs(projectId, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return api(`/projects/${projectId}/docs${query ? `?${query}` : ""}`);
}

export async function createDoc(projectId, payload) {
  return api(`/projects/${projectId}/docs`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateDoc(projectId, docId, payload) {
  return api(`/projects/${projectId}/docs/${docId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteDoc(projectId, docId) {
  return api(`/projects/${projectId}/docs/${docId}`, {
    method: "DELETE",
  });
}
