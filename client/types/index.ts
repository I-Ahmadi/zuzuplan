// User Types
export interface User {
  _id: string;
  email: string;
  name: string;
  avatar?: string;
  emailVerified: boolean;
  createdAt: string;
  updatedAt: string;
}

// Project Types
export interface Project {
  _id: string;
  name: string;
  description?: string;
  ownerId: string;
  progress: number;
  createdAt: string;
  updatedAt: string;
}

// Project Member Types
export type ProjectRole = 'Owner' | 'Admin' | 'Member' | 'Viewer';

export interface ProjectMember {
  _id: string;
  projectId: string;
  userId: string;
  role: ProjectRole;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

export interface ProjectWithMembers extends Project {
  members?: ProjectMember[];
  owner?: User;
}

// Task Types
export type TaskStatus = 'TODO' | 'IN_PROGRESS' | 'IN_REVIEW' | 'DONE' | 'CANCELLED';
export type TaskPriority = 'LOW' | 'MEDIUM' | 'HIGH' | 'URGENT';

export interface Task {
  _id: string;
  title: string;
  description?: string;
  projectId: string;
  assigneeId?: string;
  dueDate?: string;
  priority: TaskPriority;
  status: TaskStatus;
  createdAt: string;
  updatedAt: string;
  assignee?: User;
  comments?: Comment[];
  attachments?: Attachment[];
  subtasks?: Subtask[];
}

// Subtask Types
export interface Subtask {
  _id: string;
  taskId: string;
  title: string;
  completed: boolean;
  createdAt: string;
  updatedAt: string;
}

// Comment Types
export interface Comment {
  _id: string;
  taskId: string;
  userId: string;
  content: string;
  createdAt: string;
  updatedAt: string;
  user?: User;
}

// Attachment Types
export interface Attachment {
  _id: string;
  taskId: string;
  fileName: string;
  fileUrl: string;
  fileType: string;
  fileSize: number;
  uploadedBy: string;
  createdAt: string;
  uploader?: User;
}

// Notification Types
export interface Notification {
  _id: string;
  userId: string;
  type: string;
  message: string;
  read: boolean;
  relatedId?: string;
  createdAt: string;
}

// Activity Log Types
export interface ActivityLog {
  _id: string;
  projectId: string;
  userId: string;
  action: string;
  entityType: string;
  entityId: string;
  details?: Record<string, unknown>;
  createdAt: string;
  user?: User;
}

// API Response Types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    pages: number;
  };
  error?: {
    message: string;
    code?: string;
  };
}

// Auth Types
export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  password: string;
  name: string;
}

export interface AuthResponse {
  user: User;
  accessToken: string;
  refreshToken: string;
}

// Project Stats
export interface ProjectStats {
  totalTasks: number;
  completedTasks: number;
  inProgressTasks: number;
  pendingTasks: number;
  membersCount: number;
  progress: number;
}

