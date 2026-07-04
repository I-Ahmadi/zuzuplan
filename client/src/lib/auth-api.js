const ACCESS_TOKEN_KEY = "accessToken";
const REFRESH_TOKEN_KEY = "refreshToken";
const USER_KEY = "user";
const SESSION_EXPIRED_KEY = "sessionExpired";

export const AUTH_SESSION_EXPIRED_EVENT = "auth:session-expired";

let accessToken = null;

function canUseStorage() {
  return typeof window !== "undefined";
}

export function getAccessToken() {
  if (accessToken) {
    return accessToken;
  }

  if (!canUseStorage()) {
    return null;
  }

  accessToken = localStorage.getItem(ACCESS_TOKEN_KEY);
  return accessToken;
}

export function setAccessToken(token) {
  accessToken = token || null;

  if (!canUseStorage()) {
    return;
  }

  if (token) {
    localStorage.setItem(ACCESS_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(ACCESS_TOKEN_KEY);
  }
}

export function getRefreshToken() {
  if (!canUseStorage()) {
    return null;
  }

  return localStorage.getItem(REFRESH_TOKEN_KEY);
}

export function setRefreshToken(token) {
  if (!canUseStorage()) {
    return;
  }

  if (token) {
    localStorage.setItem(REFRESH_TOKEN_KEY, token);
  } else {
    localStorage.removeItem(REFRESH_TOKEN_KEY);
  }
}

export function getStoredUser() {
  if (!canUseStorage()) {
    return null;
  }

  const value = localStorage.getItem(USER_KEY);

  if (!value) {
    return null;
  }

  try {
    return JSON.parse(value);
  } catch {
    localStorage.removeItem(USER_KEY);
    return null;
  }
}

export function setStoredUser(user) {
  if (!canUseStorage()) {
    return;
  }

  if (user) {
    localStorage.setItem(USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(USER_KEY);
  }
}

export function clearAuth() {
  accessToken = null;

  if (!canUseStorage()) {
    return;
  }

  localStorage.removeItem(ACCESS_TOKEN_KEY);
  localStorage.removeItem(REFRESH_TOKEN_KEY);
  localStorage.removeItem(USER_KEY);
}

export function expireAuthSession() {
  clearAuth();

  if (canUseStorage()) {
    sessionStorage.setItem(SESSION_EXPIRED_KEY, "true");
    window.dispatchEvent(new Event(AUTH_SESSION_EXPIRED_EVENT));
  }
}

export function consumeSessionExpiredNotice() {
  if (!canUseStorage()) {
    return false;
  }

  const wasExpired = sessionStorage.getItem(SESSION_EXPIRED_KEY) === "true";
  sessionStorage.removeItem(SESSION_EXPIRED_KEY);
  return wasExpired;
}
