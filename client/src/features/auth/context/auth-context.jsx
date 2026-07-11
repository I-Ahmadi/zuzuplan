import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import {
  AUTH_SESSION_EXPIRED_EVENT,
  clearAuth,
  getAccessToken,
  getRefreshToken,
  getStoredUser,
  setAccessToken,
  setRefreshToken,
  setStoredUser,
} from "@/services/auth-session";
import { api, refreshAccessToken } from "@/services/api-client";

const AuthContext = createContext(undefined);

async function fetchCurrentUser() {
  const response = await api("/users/me", { method: "GET" });

  if (!response.success) {
    throw new Error(response.error?.message || "Failed to load current user");
  }

  return response.data;
}

export function AuthProvider({ children }) {
  const [user, setUser] = useState(() => getStoredUser());
  const [loading, setLoading] = useState(true);

  const clearSession = useCallback(() => {
    clearAuth();
    setUser(null);
  }, []);

  const bootstrapSession = useCallback(async () => {
    const storedUser = getStoredUser();
    const accessToken = getAccessToken();
    const refreshToken = getRefreshToken();

    if (!accessToken && !refreshToken) {
      clearSession();
      setLoading(false);
      return;
    }

    if (storedUser) {
      setUser(storedUser);
    }

    try {
      if (!accessToken && refreshToken) {
        await refreshAccessToken();
      }

      const currentUser = await fetchCurrentUser();
      setStoredUser(currentUser);
      setUser(currentUser);
    } catch (error) {
      clearSession();
    } finally {
      setLoading(false);
    }
  }, [clearSession]);

  useEffect(() => {
    bootstrapSession();
  }, [bootstrapSession]);

  useEffect(() => {
    function handleSessionExpired() {
      clearSession();
      setLoading(false);
    }

    window.addEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
    return () => window.removeEventListener(AUTH_SESSION_EXPIRED_EVENT, handleSessionExpired);
  }, [clearSession]);

  const signup = useCallback(async ({ name, email, password }) => {
    const response = await api("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    });

    if (!response.success) {
      throw new Error(response.error?.message || "Registration failed");
    }

    return response.data;
  }, []);

  const login = useCallback(async ({ email, password }) => {
    const response = await api("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    });

    if (!response.success) {
      throw new Error(response.error?.message || "Login failed");
    }

    const nextAccessToken  = response.data.accessToken;
    const nextRefreshToken = response.data.refreshToken;
    const nextUser         = response.data.user;

    if (!nextAccessToken || !nextRefreshToken || !nextUser) {
      throw new Error("Login response is missing session data");
    }

    setAccessToken(nextAccessToken);
    setRefreshToken(nextRefreshToken);
    setStoredUser(nextUser);
    setUser(nextUser);

    return response.data;
  }, []);

  const logout = useCallback(async () => {
    try {
      const refreshToken = getRefreshToken();

      if (refreshToken) {
        await api(
          "/auth/logout",
          {
            method: "POST",
            body: JSON.stringify({ token: refreshToken }),
          },
          false
        );
      }
    } finally {
      clearSession();
    }
  }, [clearSession]);

  const forgotPassword = useCallback(async (email) => {
    const response = await api("/auth/forgot-password", {
      method: "POST",
      body: JSON.stringify({ email }),
    });

    if (!response.success) {
      throw new Error(response.error?.message || "Failed to request password reset");
    }

    return response;
  }, []);

  const resetPassword = useCallback(async ({ token, password }) => {
    const response = await api("/auth/reset-password", {
      method: "POST",
      body: JSON.stringify({ token, password }),
    });

    if (!response.success) {
      throw new Error(response.error?.message || "Failed to reset password");
    }

    return response;
  }, []);

  const verifyEmail = useCallback(async (token) => {
    const response = await api("/auth/verify-email", {
      method: "POST",
      body: JSON.stringify({ token }),
    });

    if (!response.success) {
      throw new Error(response.error?.message || "Failed to verify email");
    }

    return response.data;
  }, []);

  const value = useMemo(
    () => ({
      user,
      loading,
      isAuthenticated: Boolean(user),
      signup,
      login,
      logout,
      forgotPassword,
      resetPassword,
      verifyEmail,
      refreshSession: bootstrapSession,
    }),
    [
      user,
      loading,
      signup,
      login,
      logout,
      forgotPassword,
      resetPassword,
      verifyEmail,
      bootstrapSession,
    ]
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
