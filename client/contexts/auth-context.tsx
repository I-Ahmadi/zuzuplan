'use client';

import React, { createContext, useContext, useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { api } from '@/lib/api';
import { getAccessToken, getRefreshToken, setAuthTokens, clearAuthTokens } from '@/lib/auth';
import { User, AuthResponse } from '@/types';

interface AuthContextType {
  user: User | null;
  loading: boolean;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<void>;
  register: (email: string, password: string, name: string) => Promise<void>;
  logout: () => Promise<void>;
  refreshUser: () => Promise<void>;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const router = useRouter();

  const checkAuth = useCallback(async () => {
    try {
      const token = getAccessToken();
      if (!token) {
        setLoading(false);
        return;
      }

      // Try to get user info or validate token
      // For now, we'll just check if token exists
      // You might want to add a /me endpoint to get current user
      setLoading(false);
    } catch (error) {
      console.error('Auth check failed:', error);
      clearAuthTokens();
      setUser(null);
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    checkAuth();
  }, [checkAuth]);

  const login = async (email: string, password: string) => {
    try {
      const response = await api.login({ email, password });
      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;
        setAuthTokens(accessToken, refreshToken);
        setUser(user);
        router.push('/dashboard');
      }
    } catch (error: any) {
      throw new Error(error.message || 'Login failed');
    }
  };

  const register = async (email: string, password: string, name: string) => {
    try {
      const response = await api.register({ email, password, name });
      if (response.success && response.data) {
        const { user, accessToken, refreshToken } = response.data;
        setAuthTokens(accessToken, refreshToken);
        setUser(user);
        // Redirect to verify email page if email not verified
        if (!user.emailVerified) {
          router.push('/verify-email');
        } else {
          router.push('/dashboard');
        }
      }
    } catch (error: any) {
      throw new Error(error.message || 'Registration failed');
    }
  };

  const logout = async () => {
    try {
      await api.logout();
    } catch (error) {
      console.error('Logout error:', error);
    } finally {
      clearAuthTokens();
      setUser(null);
      router.push('/login');
    }
  };

  const refreshUser = async () => {
    // This would fetch updated user data
    // For now, we'll just refresh the token if needed
    try {
      const refreshToken = getRefreshToken();
      if (refreshToken) {
        const response = await api.refreshToken();
        if (response.success && response.data) {
          const currentRefreshToken = getRefreshToken();
          if (currentRefreshToken) {
            setAuthTokens(response.data.accessToken, currentRefreshToken);
          }
        }
      }
    } catch (error) {
      console.error('Token refresh failed:', error);
      clearAuthTokens();
      setUser(null);
      router.push('/login');
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        loading,
        isAuthenticated: !!user && !!getAccessToken(),
        login,
        register,
        logout,
        refreshUser,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}

