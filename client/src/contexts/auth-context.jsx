"use client";

import { createContext, useContext, useState } from "react";

const AuthContext = createContext(undefined);

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null);
  const [loading] = useState(true);

  const signup = async () => {
    console.warn("Signup is not implemented in auth-context yet.");
  };

  const login = async () => {
    console.warn("Login is not implemented in auth-context yet.");
  };

  const logout = () => {
    try {
        setUser(null);
        localStorage.removeItem("user");
        localStorage.removeItem("accessToken");   

    } catch (error) {
        console.error("Logout error", error);
    }
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, signup }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);

  if (!context) {
    throw new Error("useAuth must be used inside AuthProvider");
  }

  return context;
}
