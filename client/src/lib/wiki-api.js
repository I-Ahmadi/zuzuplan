import { api } from "@/lib/api";

function paramsQuery(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export async function getWikiPages(projectId, params = {}) {
  return api(`/spaces/${projectId}/wiki${paramsQuery(params)}`);
}

export async function getWikiPage(projectId, pageId) {
  return api(`/spaces/${projectId}/wiki/${pageId}`);
}

export async function createWikiPage(projectId, payload) {
  return api(`/spaces/${projectId}/wiki`, {
    method: "POST",
    body: JSON.stringify(payload),
  });
}

export async function updateWikiPage(projectId, pageId, payload) {
  return api(`/spaces/${projectId}/wiki/${pageId}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export async function deleteWikiPage(projectId, pageId) {
  return api(`/spaces/${projectId}/wiki/${pageId}`, {
    method: "DELETE",
  });
}
