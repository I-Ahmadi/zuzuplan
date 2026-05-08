import { api } from "@/lib/api";

export async function getTaskComments(taskId, params = {}) {
  const searchParams = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      searchParams.set(key, value);
    }
  });

  const query = searchParams.toString();
  return api(`/tasks/${taskId}/comments${query ? `?${query}` : ""}`);
}

export async function createComment(taskId, content) {
  return api(`/tasks/${taskId}/comments`, {
    method: "POST",
    body: JSON.stringify({ content }),
  });
}
