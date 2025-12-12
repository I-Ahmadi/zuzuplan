import { ApiResponse, AuthResponse, LoginRequest, RegisterRequest } from '@/types';

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3000/api';

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const token = typeof window !== 'undefined' ? localStorage.getItem('accessToken') : null;

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...options.headers,
    };

    if (token) {
      headers['Authorization'] = `Bearer ${token}`;
    }

    const response = await fetch(`${this.baseUrl}${endpoint}`, {
      ...options,
      headers,
      credentials: 'include',
    });

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error?.message || 'An error occurred');
    }

    return data;
  }

  // Auth endpoints
  async login(credentials: LoginRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/login', {
      method: 'POST',
      body: JSON.stringify(credentials),
    });
  }

  async register(data: RegisterRequest): Promise<ApiResponse<AuthResponse>> {
    return this.request<AuthResponse>('/auth/register', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async logout(): Promise<ApiResponse<void>> {
    return this.request<void>('/auth/logout', {
      method: 'POST',
    });
  }

  async refreshToken(): Promise<ApiResponse<{ accessToken: string }>> {
    return this.request<{ accessToken: string }>('/auth/refresh', {
      method: 'POST',
    });
  }

  async forgotPassword(email: string): Promise<ApiResponse<void>> {
    return this.request<void>('/auth/forgot-password', {
      method: 'POST',
      body: JSON.stringify({ email }),
    });
  }

  async resetPassword(token: string, password: string): Promise<ApiResponse<void>> {
    return this.request<void>('/auth/reset-password', {
      method: 'POST',
      body: JSON.stringify({ token, password }),
    });
  }

  // Project endpoints
  async getProjects(params?: {
    search?: string;
    page?: number;
    limit?: number;
  }): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (params?.search) queryParams.append('search', params.search);
    if (params?.page) queryParams.append('page', params.page.toString());
    if (params?.limit) queryParams.append('limit', params.limit.toString());

    const query = queryParams.toString();
    return this.request<any[]>(`/projects${query ? `?${query}` : ''}`);
  }

  async getProject(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/projects/${id}`);
  }

  async createProject(data: { name: string; description?: string }): Promise<ApiResponse<any>> {
    return this.request<any>('/projects', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProject(
    id: string,
    data: { name?: string; description?: string; progress?: number }
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`/projects/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteProject(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/projects/${id}`, {
      method: 'DELETE',
    });
  }

  async getProjectMembers(id: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/projects/${id}/members`);
  }

  async addProjectMember(
    projectId: string,
    data: { userId: string; role: string }
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`/projects/${projectId}/members`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateProjectMemberRole(
    projectId: string,
    userId: string,
    role: string
  ): Promise<ApiResponse<any>> {
    return this.request<any>(`/projects/${projectId}/members/${userId}`, {
      method: 'PUT',
      body: JSON.stringify({ role }),
    });
  }

  async removeProjectMember(projectId: string, userId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/projects/${projectId}/members/${userId}`, {
      method: 'DELETE',
    });
  }

  async getProjectStats(id: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/projects/${id}/stats`);
  }

  // Task endpoints
  async getTasks(
    projectId: string,
    params?: { status?: string; assigneeId?: string; search?: string }
  ): Promise<ApiResponse<any[]>> {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.assigneeId) queryParams.append('assigneeId', params.assigneeId);
    if (params?.search) queryParams.append('search', params.search);

    const query = queryParams.toString();
    return this.request<any[]>(`/projects/${projectId}/tasks${query ? `?${query}` : ''}`);
  }

  async getTask(projectId: string, taskId: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/projects/${projectId}/tasks/${taskId}`);
  }

  async createTask(projectId: string, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/projects/${projectId}/tasks`, {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateTask(projectId: string, taskId: string, data: any): Promise<ApiResponse<any>> {
    return this.request<any>(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteTask(projectId: string, taskId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/projects/${projectId}/tasks/${taskId}`, {
      method: 'DELETE',
    });
  }

  // Comment endpoints
  async getComments(taskId: string): Promise<ApiResponse<any[]>> {
    return this.request<any[]>(`/tasks/${taskId}/comments`);
  }

  async createComment(taskId: string, content: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/tasks/${taskId}/comments`, {
      method: 'POST',
      body: JSON.stringify({ content }),
    });
  }

  async updateComment(taskId: string, commentId: string, content: string): Promise<ApiResponse<any>> {
    return this.request<any>(`/tasks/${taskId}/comments/${commentId}`, {
      method: 'PUT',
      body: JSON.stringify({ content }),
    });
  }

  async deleteComment(taskId: string, commentId: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/tasks/${taskId}/comments/${commentId}`, {
      method: 'DELETE',
    });
  }

  // Notification endpoints
  async getNotifications(): Promise<ApiResponse<any[]>> {
    return this.request<any[]>('/notifications');
  }

  async markNotificationAsRead(id: string): Promise<ApiResponse<void>> {
    return this.request<void>(`/notifications/${id}/read`, {
      method: 'PUT',
    });
  }

  async markAllNotificationsAsRead(): Promise<ApiResponse<void>> {
    return this.request<void>('/notifications/read-all', {
      method: 'PUT',
    });
  }
}

export const api = new ApiClient(API_BASE_URL);

