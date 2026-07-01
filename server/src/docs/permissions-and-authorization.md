# Server Permissions and Authorization

This document explains how authentication, project roles, permissions, and resource authorization work on the server side.

## Request Flow

Most protected API requests follow this shape:

```txt
route -> authenticate -> validators -> controller -> service authorization -> Prisma
```

The important split is:

- `authenticate` proves the request belongs to a valid user.
- Services enforce the final permission rules before reading or mutating data.

Services are the source of truth for business authorization. Routes should stay thin: authenticate the user, validate input, and call the controller.

## Authentication

Authentication lives in `server/src/middleware/auth.js`.

`authenticate` expects an `Authorization` header in this format:

```txt
Authorization: Bearer <access-token>
```

It then:

1. Verifies the access token with `verifyAccessToken`.
2. Loads the user from the database.
3. Rejects missing users with `401`.
4. Rejects unverified email accounts with `403`.
5. Attaches the authenticated user to `req.user`.

After this middleware succeeds, controllers and services can rely on:

```js
req.user = { id, email };
```

Authentication does not decide whether the user can access a project, task, sprint, comment, or delivery record. It only answers: "Who is this user?"

## Roles

Project roles are defined in `server/src/utils/constants.js`:

```js
ROLES = {
  ADMIN: 'Admin',
  MANAGER: 'Manager',
  EMPLOYEE: 'Employee',
  VIEWER: 'Viewer',
};
```

Roles are project-specific. A user can have different roles in different projects.

Project owners are treated as `Admin` even if the membership row says something else. This happens in `getProjectRole` in `server/src/utils/permissions.js`.

## Permissions

Permission names are defined in `PROJECT_PERMISSIONS` in `server/src/utils/constants.js`.

Current permission groups:

- Project: `project.read`, `project.update`, `project.delete`
- Members: `members.read`, `members.manage`
- Tasks: `task.create`, `task.read`, `task.update.any`, `task.update.own`, `task.assign`, `task.delete`
- Delivery: `delivery.read`, `delivery.write`
- Comments: `comment.create`, `comment.update.own`, `comment.delete.any`, `comment.delete.own`

Role-to-permission mapping lives in `server/src/utils/permissions.js`.

Current behavior:

- `Admin`: all project permissions.
- `Manager`: project update, member management, task management, delivery write, and comment management.
- `Employee`: project/member read, task create/read, own task updates, delivery read, and own comment actions.
- `Viewer`: project/member/task read only.

Use these helpers instead of hardcoding role checks when possible:

```js
getProjectRole(project, userId)
hasProjectPermission(role, permission)
getProjectPermissions(role)
normalizeRole(role)
```

## Service-Level Authorization

Services enforce the final business rules.

Examples:

- `projectService.js` checks project update/delete/member permissions before changing project state.
- `taskService.js` checks task read/create/delete/assign/update permissions.
- `sprintService.js` checks task update permissions for sprint planning operations.
- `deliveryService.js` checks delivery read/write permissions.
- `commentService.js` checks comment create, update-own, delete-own, and delete-any permissions.

For example, an `Employee` can access a project, but cannot assign tasks unless they have `task.assign`. The route lets the request reach the controller after authentication and validation, and `taskService` rejects the assignment.

## Task Authorization

Task access is centered around `ensureTaskAccess(taskId, userId)` in `taskService.js`.

It:

1. Loads the task with its project and members.
2. Ensures the user has `task.read`.
3. Returns the task for follow-up checks.

Task updates use `canUpdateTask(task, userId)`:

- Users with `task.update.any` can update any task in the project.
- Users with `task.update.own` can update tasks they created or tasks assigned to them.
- Other users cannot update the task.

Some task fields have stronger requirements:

- Changing `assigneeId` requires `task.assign`.
- Changing `sprintId` requires `task.update.any`.
- Deleting a task requires `task.delete`.

## Comment Authorization

Comments are authorized through the task they belong to.

Creating a comment requires:

```txt
task.read + comment.create
```

Updating a comment requires:

```txt
comment author + comment.update.own
```

Deleting a comment is allowed when either:

```txt
comment author + comment.delete.own
```

or:

```txt
comment.delete.any
```

## Invite Authorization

Project invite management is handled in `projectService.js`.

Creating, revoking, adding members, updating member roles, and removing members require:

```txt
members.manage
```

Reading members and invites requires:

```txt
members.read
```

Accepting an invite is different: the invite token identifies the project invite, and the authenticated user must have the same email address as the invite email.

## Error Codes

Authorization failures generally use:

- `401` when authentication is missing, invalid, expired, or the user no longer exists.
- `403` when the user is authenticated but not allowed to perform the action.
- `404` when the protected resource does not exist or should not be exposed.
- `400` when a required authorization input, such as project ID, is missing.

Errors are created with `AppError` and formatted by `server/src/middleware/errorHandler.js`.

## How to Add a New Permission-Protected Feature

1. Add a permission constant in `PROJECT_PERMISSIONS` if the feature needs a new capability.
2. Add that permission to the right roles in `ROLE_PERMISSIONS`.
3. Add route validators for params, query, and body.
4. Use `authenticate` on protected routes.
5. Enforce the final permission check in the service before reading or mutating data.
6. Return domain errors through `AppError`.

Do not rely only on frontend role checks. The server must enforce all access rules.

## Current Caveats

- Routes no longer perform project authorization. They only authenticate and validate.
- Services independently load project access and enforce permissions.
