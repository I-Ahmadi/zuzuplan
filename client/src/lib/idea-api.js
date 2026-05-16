import { api } from "@/lib/api";

function queryString(params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") searchParams.set(key, value);
  });
  const query = searchParams.toString();
  return query ? `?${query}` : "";
}

export function getIdeas(params = {}) {
  return api(`/ideas${queryString(params)}`);
}

export function createIdea(payload) {
  return api("/ideas", { method: "POST", body: JSON.stringify(payload) });
}

export function getIdea(ideaId) {
  return api(`/ideas/${ideaId}`);
}

export function updateIdea(ideaId, payload) {
  return api(`/ideas/${ideaId}`, { method: "PUT", body: JSON.stringify(payload) });
}

export function deleteIdea(ideaId) {
  return api(`/ideas/${ideaId}`, { method: "DELETE" });
}

export function archiveIdea(ideaId) {
  return api(`/ideas/${ideaId}/archive`, { method: "POST" });
}

export function finalizeIdea(ideaId) {
  return api(`/ideas/${ideaId}/finalize`, { method: "POST" });
}

export function createIdeaSection(ideaId, payload) {
  return api(`/ideas/${ideaId}/sections`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateIdeaSection(ideaId, sectionId, payload) {
  return api(`/ideas/${ideaId}/sections/${sectionId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function createIdeaVersion(ideaId, payload) {
  return api(`/ideas/${ideaId}/versions`, { method: "POST", body: JSON.stringify(payload) });
}

export function getIdeaVersions(ideaId) {
  return api(`/ideas/${ideaId}/versions`);
}

export function previewIdeaVersion(ideaId, versionId) {
  return api(`/ideas/${ideaId}/versions/${versionId}/restore-preview`, { method: "POST" });
}

export function getIdeaComments(ideaId) {
  return api(`/ideas/${ideaId}/comments`);
}

export function createIdeaComment(ideaId, payload) {
  return api(`/ideas/${ideaId}/comments`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateIdeaComment(ideaId, commentId, payload) {
  return api(`/ideas/${ideaId}/comments/${commentId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteIdeaComment(ideaId, commentId) {
  return api(`/ideas/${ideaId}/comments/${commentId}`, { method: "DELETE" });
}

export function createIdeaItem(ideaId, collection, payload) {
  return api(`/ideas/${ideaId}/${collection}`, { method: "POST", body: JSON.stringify(payload) });
}

export function updateIdeaItem(ideaId, collection, itemId, payload) {
  return api(`/ideas/${ideaId}/${collection}/${itemId}`, { method: "PATCH", body: JSON.stringify(payload) });
}

export function deleteIdeaItem(ideaId, collection, itemId) {
  return api(`/ideas/${ideaId}/${collection}/${itemId}`, { method: "DELETE" });
}

export function previewIdeaConversion(ideaId, payload = {}) {
  return api(`/ideas/${ideaId}/conversion-preview`, { method: "POST", body: JSON.stringify(payload) });
}

export function convertIdea(ideaId, payload = {}) {
  return api(`/ideas/${ideaId}/convert`, { method: "POST", body: JSON.stringify(payload) });
}

export function requestIdeaAi(ideaId, action) {
  return api(`/ideas/${ideaId}/ai/${action}`, { method: "POST" });
}
