import { api } from "@/lib/api";

export function getForYouDashboard(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return api(`/dashboard/for-you${query.toString() ? `?${query}` : ""}`);
}
