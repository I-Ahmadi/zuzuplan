import { api } from "@/lib/api";

export async function globalSearch(query) {
  const params = new URLSearchParams();
  if (query) params.set("q", query);
  return api(`/search?${params.toString()}`);
}
