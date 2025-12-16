'use client';

import { api } from './api';
import { User } from '@/types';

export function setAuthTokens(accessToken: string, refreshToken: string) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('accessToken', accessToken);
    localStorage.setItem('refreshToken', refreshToken);
  }
}

export function getAccessToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('accessToken');
  }
  return null;
}

export function getRefreshToken(): string | null {
  if (typeof window !== 'undefined') {
    return localStorage.getItem('refreshToken');
  }
  return null;
}

export function setUser(user: User) {
  if (typeof window !== 'undefined') {
    localStorage.setItem('user', JSON.stringify(user));
  }
}

export function getUser(): User | null {
  if (typeof window !== 'undefined') {
    const userStr = localStorage.getItem('user');
    if (userStr) {
      try {
        return JSON.parse(userStr) as User;
      } catch (error) {
        console.error('Failed to parse user from localStorage:', error);
        return null;
      }
    }
  }
  return null;
}

export function clearAuthTokens() {
  if (typeof window !== 'undefined') {
    localStorage.removeItem('accessToken');
    localStorage.removeItem('refreshToken');
    localStorage.removeItem('user');
  }
}

export async function logout() {
  try {
    await api.logout();
  } catch (error) {
    console.error('Logout error:', error);
  } finally {
    clearAuthTokens();
    if (typeof window !== 'undefined') {
      window.location.href = '/login';
    }
  }
}

