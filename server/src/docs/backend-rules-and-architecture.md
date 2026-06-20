# ZuzuPlan Backend Rules and Architecture

Use this document for work under `server/`, including API routes, controllers, services, middleware, Prisma, auth, validation, uploads, backend utilities, and backend tests.

## Current Stack

- Node.js
- Express
- PostgreSQL
- Prisma
- JavaScript in the current implementation

Prefer TypeScript for new large modules or migration work only when the surrounding build and runtime support it. Do not introduce a partial TypeScript toolchain for a small backend change unless that is the requested task.

## Current Folder Structure

```txt
server/
  config/
    database.js
  controllers/
  middleware/
  prisma/
    schema.prisma
    migrations/
  routes/
  services/
  utils/
  index.js
  package.json
```

## Backend Principles

- Keep route handlers thin.
- Controllers translate HTTP input into service calls and HTTP responses.
- Services own business rules, authorization orchestration, transactions, and cross-resource behavior.
- Database access should stay isolated in services or dedicated repository helpers.
- Middleware owns cross-cutting request behavior.
- Utilities should be framework-light and reusable.
- Validate and authorize before mutating data.
- Log server-side details, return safe client-facing messages.

## Request Flow

```txt
route -> validation middleware -> controller -> service -> database
```

For larger new modules, prefer this target flow:

```txt
route -> validation middleware -> controller -> service -> repository -> database
```

Routes define HTTP method, path, middleware, and controller binding. Controllers should not contain Prisma query details. Services should not receive raw Express `req` or `res` unless the surrounding legacy code already does and the change is intentionally small.

## Routes

- Route files live in `server/routes`.
- Use plural route names such as `/projects`, `/tasks`, and `/users`.
- Use resource nesting only when ownership is clear:

```txt
GET /api/projects/:projectId/tasks
POST /api/projects/:projectId/tasks
GET /api/projects/:projectId/wiki
POST /api/projects/:projectId/wiki
GET /api/tasks/:taskId
PATCH /api/tasks/:taskId
DELETE /api/tasks/:taskId
```

- Keep route files readable: middleware first, controller last.
- Avoid putting business logic in route callbacks.

## Controllers

- Controller files live in `server/controllers`.
- Controllers should parse request data, call services, and send normalized responses.
- Use `next(error)` for errors so the central error handler owns response formatting.
- Do not expose stack traces, Prisma internals, tokens, or sensitive payloads.

Example:

```js
async function createTaskController(req, res, next) {
  try {
    const task = await taskService.createTask({
      projectId: req.params.projectId,
      actorId: req.user.id,
      input: req.body,
    });

    res.status(201).json({ success: true, data: task });
  } catch (error) {
    next(error);
  }
}
```

## Services

- Service files live in `server/services`.
- Services own business rules, permission checks, transactions, and orchestration.
- Keep transaction boundaries in services.
- Keep permission checks centralized and consistent with `server/src/utils/permissions.js`.
- Keep service function names intent-based, such as `createProjectTask`, `updateTaskStatus`, or `listProjectMembers`.
- Avoid returning raw sensitive fields from service functions.

## Middleware

Middleware files live in `server/middleware`.

- `auth.js`: verifies identity and attaches the authenticated user.
- `validation.js`: validates payloads and returns structured errors.
- `errorHandler.js`: central error response handling.
- `notFoundHandler.js`: handles unmatched routes.

Middleware should be composable and small.

## Validation and Request Handling

- Validate `body`, `params`, and `query` before controllers perform work.
- Strip or ignore unknown fields from incoming payloads.
- Validate pagination bounds.
- Never trust IDs, roles, user IDs, project membership, or ownership from the client.
- Keep validation error shapes consistent with the API response envelope in the root rules file.

## Authentication and Authorization

- Authentication answers: who is this user?
- Authorization answers: can this user perform this action on this resource?
- Keep JWT creation, refresh, verification, and revocation in the auth service or auth utilities.
- Store password hashes only. Never store plain-text passwords.
- Use short-lived access tokens and refresh token rotation where supported.
- Centralize permission checks in services or dedicated authorization helpers.
- Use role and resource-based checks for projects:

```txt
owner -> full project control
admin -> manage members and settings
member -> create and update assigned work
viewer -> read-only access
```

## Error Handling

- Use custom operational errors with status codes when the project already has an error helper for the touched area.
- Throw domain errors from services.
- Let the central error handler convert errors to API responses.
- Log server-side details once at the boundary.
- Return safe messages to clients.
- Include request IDs in responses when request ID middleware is available.

Recommended error response:

```json
{
  "success": false,
  "error": {
    "code": "TASK_NOT_FOUND",
    "message": "Task not found.",
    "details": null
  },
  "meta": {
    "requestId": "req_123"
  }
}
```

## Database and Prisma

- Use Prisma through the shared database client in `server/config/database.js` or the local established helper.
- Keep migrations committed.
- Review generated migrations before applying them.
- Use transactions for multi-write operations.
- Add indexes for foreign keys, filters, sorting, and unique constraints.
- Do not expose Prisma model objects blindly if the API contract needs a different shape.
- Keep generated Prisma client files out of hand edits.

## Environment Configuration

- Validate required environment variables during startup where practical.
- Keep `.env.example` synchronized with required variables.
- Never commit `.env`.
- Use different env files or secret stores for development, staging, and production.

Common server variables:

```txt
NODE_ENV=development
PORT=3000
DATABASE_URL=postgresql://...
JWT_SECRET=...
JWT_REFRESH_SECRET=...
CORS_ORIGIN=http://localhost:5173
```

## Logging and Monitoring

- Use structured logging in production paths where available.
- Include request ID, user ID when available, method, path, status, and duration.
- Do not log passwords, tokens, session cookies, or sensitive payloads.
- Health checks should remain lightweight.
- Track API latency, error rates, database failures, and auth failures.

## Security Best Practices

- Use secure headers through Helmet or equivalent middleware where configured.
- Configure CORS with explicit allowed origins.
- Rate-limit auth, invite, upload, and search endpoints.
- Validate and sanitize all inputs.
- Use secure, HTTP-only cookies if storing refresh tokens in cookies.
- Hash passwords with bcrypt or Argon2.
- Restrict upload file type, size, and destination.
- Never expose internal error details.
- Use least-privilege database credentials.
- Keep dependencies updated and audit regularly.

## Naming Conventions

- Existing route files use plural resources, for example `tasks.js`.
- Existing controllers use names such as `taskController.js`.
- Existing services use names such as `taskService.js`.
- Functions and variables use `camelCase`.
- Classes use `PascalCase`.
- Constants use `SCREAMING_SNAKE_CASE`.
- Prisma models should keep domain names consistent with frontend and API names.

## Testing

Preferred structure when tests are added:

```txt
server/tests/unit/
server/tests/integration/
server/services/__tests__/
server/controllers/__tests__/
```

Rules:

- Unit test pure utilities, services, and validation rules.
- Integration test API endpoints and database behavior.
- Mock external services, not internal business logic.
- Add regression tests for bug fixes.
- Tests should be deterministic and independent.
- For database tests, isolate data by transaction, schema, or test database.

## Scalability and Maintainability

- Keep domain concepts named consistently across frontend, backend, database, and docs.
- Avoid shared mutable state.
- Keep API contracts backward compatible when possible.
- Use pagination for collection endpoints.
- Use background jobs for slow work such as email, imports, exports, and notifications.
- Use feature flags for risky rollouts.
- Keep permissions centralized.
- Review performance before adding broad eager-loading or large payloads.
- Prefer incremental migrations over large rewrites.
