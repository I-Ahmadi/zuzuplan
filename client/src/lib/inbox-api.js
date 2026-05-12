import { api } from "@/lib/api";

export function getInboxItems(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return api(`/inbox${query.toString() ? `?${query}` : ""}`);
}

export function updateInboxItem(id, payload) {
  return api(`/inbox/${id}`, {
    method: "PUT",
    body: JSON.stringify(payload),
  });
}

export function markInboxRead() {
  return api("/inbox/mark-read", { method: "POST" });
}
