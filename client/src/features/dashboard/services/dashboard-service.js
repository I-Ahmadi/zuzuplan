import { api } from "@/services/api-client";

export function getHomeDashboard(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return api(`/home${query.toString() ? `?${query}` : ""}`);
}
