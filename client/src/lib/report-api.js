import { api } from "@/lib/api";

export function getDeliveryHealthReport(params = {}) {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") query.set(key, value);
  });
  return api(`/reports/delivery-health${query.toString() ? `?${query}` : ""}`);
}
