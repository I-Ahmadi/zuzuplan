import {
  getAccessToken,
  getRefreshToken,
  setAccessToken,
  setRefreshToken,
} from "@/lib/auth-api";

const configuredApiBase = import.meta.env.VITE_API_URL;

if (import.meta.env.PROD && !configuredApiBase) {
  console.error("Missing VITE_API_URL. Production API requests may fail.");
}

const API_BASE = (configuredApiBase || "/api").replace(/\/$/, "");

let refreshPromise = null;
const pendingGetRequests = new Map();

async function parseResponse(res) {
  const contentType = res.headers.get("content-type");

  if (contentType?.includes("application/json")) {
    return res.json();
  }

  const text = await res.text();
  return { success: false, error: { message: text || "Invalid response" } };
}

export async function refreshAccessToken() {
  const refreshToken = getRefreshToken();

  if (!refreshToken) {
    throw new Error("No refresh token available");
  }

  if (!refreshPromise) {
    refreshPromise = (async () => {
      const res = await fetch(`${API_BASE}/auth/refresh`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ token: refreshToken }),
        credentials: "include",
      });

      const data = await parseResponse(res);

      if (!res.ok || !data?.success || !data?.data?.accessToken) {
        throw new Error(data?.error?.message || "Session refresh failed");
      }

      setAccessToken(data.data.accessToken);
      if (data.data.refreshToken) {
        setRefreshToken(data.data.refreshToken);
      }
      return data.data.accessToken;
    })().finally(() => {
      refreshPromise = null;
    });
  }

  return refreshPromise;
}

export async function api(endpoint, options = {}, retry = true) {
  const token = getAccessToken();
  const headers = { ...(options.headers || {}) };
  const isFormData = options.body instanceof FormData;
  const method = (options.method || "GET").toUpperCase();

  if (!isFormData && !headers["Content-Type"]) {
    headers["Content-Type"] = "application/json";
  }

  if (token) {
    headers.Authorization = `Bearer ${token}`;
  }

  const url = endpoint.startsWith("http") ? endpoint : `${API_BASE}${endpoint}`;
  const canDedupe = method === "GET" && !options.body;
  const dedupeKey = canDedupe ? `${method}:${url}:${token || ""}` : null;

  if (dedupeKey && pendingGetRequests.has(dedupeKey)) {
    return pendingGetRequests.get(dedupeKey);
  }

  const request = (async () => {
    const res = await fetch(url, {
      ...options,
      method,
      headers,
      credentials: "include",
    });

    const data = await parseResponse(res);

    const shouldTryRefresh =
      res.status === 401 &&
      retry &&
      endpoint !== "/auth/login" &&
      endpoint !== "/auth/register" &&
      endpoint !== "/auth/refresh" &&
      endpoint !== "/auth/forgot-password" &&
      endpoint !== "/auth/reset-password" &&
      endpoint !== "/auth/verify-email";

    if (shouldTryRefresh) {
      try {
        await refreshAccessToken();
        return api(endpoint, options, false);
      } catch {
        return {
          success: false,
          error: { message: "Session refresh failed" },
          status: 401,
        };
      }
    }

    if (!res.ok) {
      return {
        success: false,
        error: data?.error || { message: data?.message || "Request failed" },
        status: res.status,
      };
    }

    return data;
  })();

  if (!dedupeKey) return request;

  pendingGetRequests.set(dedupeKey, request);
  request.then(
    () => pendingGetRequests.delete(dedupeKey),
    () => pendingGetRequests.delete(dedupeKey)
  );
  return request;
}
