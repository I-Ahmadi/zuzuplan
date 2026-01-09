import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest } from '@/types';
import { getAccessToken, getRefreshToken, setAuthTokens, clearAuthTokens } from './auth';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

// Module-level state for token refresh
let isRefreshing = false;
let refreshPromise: Promise<string> | null = null;

async function refreshAccessToken(): Promise<string> {
  if (isRefreshing && refreshPromise) {
    return refreshPromise;
  }

  isRefreshing = true;
  refreshPromise = (async () => {
    try {
      const refreshToken = getRefreshToken();
      if (!refreshToken) {
        throw new Error('No refresh token available');
      }

      const response = await fetch(`${API_BASE_URL}/auth/refresh`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token: refreshToken }),
        credentials: 'include',
      });

      const contentType = response.headers.get('content-type');
      let data: any;
      
      if (contentType && contentType.includes('application/json')) {
        data = await response.json();
      } else {
        const text = await response.text();
        throw new Error(
          `Token refresh failed: Server returned non-JSON response (${response.status})`
        );
      }

      if (!response.ok) {
        throw new Error(data.error?.message || 'Token refresh failed');
      }

      if (data.success && data.data?.accessToken) {
        const currentRefreshToken = getRefreshToken();
        if (currentRefreshToken) {
          setAuthTokens(data.data.accessToken, currentRefreshToken);
        }
        return data.data.accessToken;
      }

      throw new Error('Invalid refresh response');
    } catch (error: any) {
      clearAuthTokens();
      // Handle network errors
      if (error instanceof TypeError && error.message.includes('fetch')) {
        throw new Error(
          `Unable to connect to the server. Please make sure the backend server is running at ${API_BASE_URL}.`
        );
      }
      if (typeof window !== 'undefined') {
        window.location.href = '/login';
      }
      throw error;
    } finally {
      isRefreshing = false;
      refreshPromise = null;
    }
  })();

  return refreshPromise;
}

async function request<T>(
  endpoint: string,
  options: RequestInit = {},
  retry = true
): Promise<ApiResponse<T>> {
  try {
    const token = typeof window !== 'undefined' ? getAccessToken() : null;

    const headers: Record<string, string> = {
      'Content-Type': 'application/json',
      ...(options.headers as Record<string, string>),
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers: headers as HeadersInit,
      credentials: 'include',
    });

    // Check if response is JSON before parsing
    const contentType = response.headers.get('content-type');
    let data: any;
    
    if (contentType && contentType.includes('application/json')) {
      data = await response.json();
    } else {
      // If not JSON, try to get text for error message
      const text = await response.text();
      throw new Error(
        `Server returned non-JSON response (${response.status} ${response.statusText}). ` +
        `This usually means the API endpoint is not available. ` +
        `Please check that the server is running at ${API_BASE_URL}${endpoint}`
      );
    }

    // Handle 401 Unauthorized - try to refresh token
    if (response.status === 401 && retry && endpoint !== '/auth/refresh' && endpoint !== '/auth/login') {
      try {
        const newToken = await refreshAccessToken();
        // Retry the original request with new token
        headers['Authorization'] = `Bearer ${newToken}`;
        const retryResponse = await fetch(`${API_BASE_URL}${endpoint}`, {
          ...options,
          headers: headers as HeadersInit,
          credentials: 'include',
        });
        
        const retryContentType = retryResponse.headers.get('content-type');
        let retryData: any;
        
        if (retryContentType && retryContentType.includes('application/json')) {
          retryData = await retryResponse.json();
        } else {
          const text = await retryResponse.text();
          throw new Error(
            `Server returned non-JSON response (${retryResponse.status} ${retryResponse.statusText})`
          );
        }
        
        if (!retryResponse.ok) {
          throw new Error(retryData.error?.message || 'An error occurred');
        }
        return retryData;
      } catch (error) {
        clearAuthTokens();
        if (typeof window !== 'undefined') {
          window.location.href = '/login';
        }
        throw error;
      }
    }

    if (!response.ok) {
      throw new Error(data.error?.message || 'An error occurred');
    }

    return data;
  } catch (error: any) {
    // Handle network errors (fetch failures)
    if (error instanceof TypeError && error.message.includes('fetch')) {
      throw new Error(
        `Unable to connect to the server. Please make sure the backend server is running at ${API_BASE_URL}. ` +
        `Error: ${error.message}`
      );
    }
    // Re-throw other errors as-is
    throw error;
  }
}

// Auth endpoints
export async function login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
  return request<AuthResponse>('/auth/login', {
    method: 'POST',
    body: JSON.stringify(credentials),
  });
}

export async function register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
  return request<AuthResponse>('/auth/register', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function logout(): Promise<ApiResponse<void>> {
  const refreshToken = getRefreshToken();
  return request<void>('/auth/logout', {
    method: 'POST',
    body: JSON.stringify({ token: refreshToken || '' }),
  }, false);
}

export async function refreshToken(): Promise<ApiResponse<{ accessToken: string }>> {
  const refreshToken = getRefreshToken();
  if (!refreshToken) {
    throw new Error('No refresh token available');
  }
  return request<{ accessToken: string }>('/auth/refresh', {
    method: 'POST',
    body: JSON.stringify({ token: refreshToken }),
  }, false);
}

export async function verifyEmail(token: string): Promise<ApiResponse<void>> {
  return request<void>('/auth/verify-email', {
    method: 'POST',
    body: JSON.stringify({ token }),
  });
}

export async function forgotPassword(email: string): Promise<ApiResponse<void>> {
  return request<void>('/auth/forgot-password', {
    method: 'POST',
    body: JSON.stringify({ email }),
  });
}

export async function resetPassword(token: string, password: string): Promise<ApiResponse<void>> {
  return request<void>('/auth/reset-password', {
    method: 'POST',
    body: JSON.stringify({ token, password }),
  });
}

// Project endpoints
export async function getProjects(params?: {
  search?: string;
  page?: number;
  limit?: number;
}): Promise<ApiResponse<any[]>> {
  const queryParams = new URLSearchParams();
  if (params?.search) queryParams.append('search', params.search);
  if (params?.page) queryParams.append('page', params.page.toString());
  if (params?.limit) queryParams.append('limit', params.limit.toString());

  const query = queryParams.toString();
  return request<any[]>(`/projects${query ? `?${query}` : ''}`);
}

export async function getProject(id: string): Promise<ApiResponse<any>> {
  return request<any>(`/projects/${id}`);
}

export async function createProject(data: { name: string; description?: string }): Promise<ApiResponse<any>> {
  return request<any>('/projects', {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProject(
  id: string,
  data: { name?: string; description?: string; progress?: number }
): Promise<ApiResponse<any>> {
  return request<any>(`/projects/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteProject(id: string): Promise<ApiResponse<void>> {
  return request<void>(`/projects/${id}`, {
    method: 'DELETE',
  });
}

export async function getProjectMembers(id: string): Promise<ApiResponse<any[]>> {
  return request<any[]>(`/projects/${id}/members`);
}

export async function addProjectMember(
  projectId: string,
  data: { userId: string; role: string }
): Promise<ApiResponse<any>> {
  return request<any>(`/projects/${projectId}/members`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateProjectMemberRole(
  projectId: string,
  userId: string,
  role: string
): Promise<ApiResponse<any>> {
  return request<any>(`/projects/${projectId}/members/${userId}`, {
    method: 'PUT',
    body: JSON.stringify({ role }),
  });
}

export async function removeProjectMember(projectId: string, userId: string): Promise<ApiResponse<void>> {
  return request<void>(`/projects/${projectId}/members/${userId}`, {
    method: 'DELETE',
  });
}

export async function getProjectStats(id: string): Promise<ApiResponse<any>> {
  return request<any>(`/projects/${id}/stats`);
}

// Task endpoints
export async function getTasks(
  projectId: string,
  params?: { status?: string; assigneeId?: string; search?: string }
): Promise<ApiResponse<any[]>> {
  const queryParams = new URLSearchParams();
  if (params?.status) queryParams.append('status', params.status);
  if (params?.assigneeId) queryParams.append('assigneeId', params.assigneeId);
  if (params?.search) queryParams.append('search', params.search);

  const query = queryParams.toString();
  return request<any[]>(`/projects/${projectId}/tasks${query ? `?${query}` : ''}`);
}

export async function getTask(projectId: string, taskId: string): Promise<ApiResponse<any>> {
  return request<any>(`/projects/${projectId}/tasks/${taskId}`);
}

export async function createTask(projectId: string, data: any): Promise<ApiResponse<any>> {
  return request<any>(`/projects/${projectId}/tasks`, {
    method: 'POST',
    body: JSON.stringify(data),
  });
}

export async function updateTask(projectId: string, taskId: string, data: any): Promise<ApiResponse<any>> {
  return request<any>(`/projects/${projectId}/tasks/${taskId}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  });
}

export async function deleteTask(projectId: string, taskId: string): Promise<ApiResponse<void>> {
  return request<void>(`/projects/${projectId}/tasks/${taskId}`, {
    method: 'DELETE',
  });
}

// Comment endpoints
export async function getComments(taskId: string): Promise<ApiResponse<any[]>> {
  return request<any[]>(`/tasks/${taskId}/comments`);
}

export async function createComment(taskId: string, content: string): Promise<ApiResponse<any>> {
  return request<any>(`/tasks/${taskId}/comments`, {
    method: 'POST',
    body: JSON.stringify({ content }),
  });
}

export async function updateComment(taskId: string, commentId: string, content: string): Promise<ApiResponse<any>> {
  return request<any>(`/tasks/${taskId}/comments/${commentId}`, {
    method: 'PUT',
    body: JSON.stringify({ content }),
  });
}

export async function deleteComment(taskId: string, commentId: string): Promise<ApiResponse<void>> {
  return request<void>(`/tasks/${taskId}/comments/${commentId}`, {
    method: 'DELETE',
  });
}

// Notification endpoints
export async function getNotifications(): Promise<ApiResponse<any[]>> {
  return request<any[]>('/notifications');
}

export async function markNotificationAsRead(id: string): Promise<ApiResponse<void>> {
  return request<void>(`/notifications/${id}/read`, {
    method: 'PUT',
  });
}

export async function markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
  return request<void>('/notifications/read-all', {
    method: 'PUT',
  });
}

// Export all functions as a default object for backward compatibility
export const api = {
  login,
  register,
  logout,
  refreshToken,
  verifyEmail,
  forgotPassword,
  resetPassword,
  getProjects,
  getProject,
  createProject,
  updateProject,
  deleteProject,
  getProjectMembers,
  addProjectMember,
  updateProjectMemberRole,
  removeProjectMember,
  getProjectStats,
  getTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  getComments,
  createComment,
  updateComment,
  deleteComment,
  getNotifications,
  markNotificationAsRead,
  markAllNotificationsAsRead,
};
