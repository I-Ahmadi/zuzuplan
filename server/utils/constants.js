export const ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  VIEWER: 'Viewer',
};

export const PROJECT_PERMISSIONS = {
  PROJECT_READ: 'project.read',
  PROJECT_UPDATE: 'project.update',
  PROJECT_DELETE: 'project.delete',
  MEMBERS_READ: 'members.read',
  MEMBERS_MANAGE: 'members.manage',
  TASK_CREATE: 'task.create',
  TASK_READ: 'task.read',
  TASK_UPDATE_ANY: 'task.update.any',
  TASK_UPDATE_OWN: 'task.update.own',
  TASK_ASSIGN: 'task.assign',
  TASK_DELETE: 'task.delete',
  INTEGRATION_MANAGE: 'integration.manage',
  DELIVERY_READ: 'delivery.read',
  DELIVERY_WRITE: 'delivery.write',
  COMMENT_CREATE: 'comment.create',
  COMMENT_UPDATE_OWN: 'comment.update.own',
  COMMENT_DELETE_ANY: 'comment.delete.any',
  COMMENT_DELETE_OWN: 'comment.delete.own',
};

export const TASK_STATUS = {
  BACKLOG: 'BACKLOG',
  READY: 'READY',
  IN_PROGRESS: 'IN_PROGRESS',
  IN_REVIEW: 'IN_REVIEW',
  READY_TO_MERGE: 'READY_TO_MERGE',
  MERGED: 'MERGED',
  DEPLOYED: 'DEPLOYED',
  DONE: 'DONE',
  BLOCKED: 'BLOCKED',
  CANCELED: 'CANCELED',
};

export const ISSUE_TYPE = {
  BUG: 'BUG',
  FEATURE: 'FEATURE',
  CHORE: 'CHORE',
  TECH_DEBT: 'TECH_DEBT',
  SPIKE: 'SPIKE',
  INCIDENT: 'INCIDENT',
};

export const TASK_PRIORITY = {
  LOW: 'LOW',
  MEDIUM: 'MEDIUM',
  HIGH: 'HIGH',
  URGENT: 'URGENT',
};

export const SPRINT_STATUS = {
  PLANNED: 'PLANNED',
  ACTIVE: 'ACTIVE',
  COMPLETED: 'COMPLETED',
};

export const PROJECT_INVITE_STATUS = {
  PENDING: 'PENDING',
  ACCEPTED: 'ACCEPTED',
  REVOKED: 'REVOKED',
  EXPIRED: 'EXPIRED',
};

export const DEFAULT_PAGE_SIZE = 20;
export const MAX_PAGE_SIZE = 100;
