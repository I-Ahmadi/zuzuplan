# Backend Skill

Use this skill when working on ZuzuPlan backend code under `server/`, including Express routes, controllers, services, middleware, Prisma schema or migrations, auth, validation, uploads, and backend tests.

## Required Context

Read these files before making backend changes:

1. `../../../../PROJECT_RULES_AND_ARCHITECTURE.md` from the repository root
2. `../../../../docs/backend-rules-and-architecture.md` from the repository root
3. The specific files in `server/` that the task touches

If a change affects frontend API calls or user-visible behavior, also read `../../../../docs/frontend-rules-and-architecture.md` from the repository root.

## Workflow

1. Identify the route, controller, service, middleware, and Prisma model involved.
2. Keep route handlers thin and put business rules in services.
3. Validate request `body`, `params`, and `query` before mutation.
4. Check authorization in services or dedicated authorization helpers.
5. Keep Prisma access isolated to services or repository-style helpers.
6. Use transactions for multi-write operations.
7. Return normalized success and error responses.
8. Run the relevant backend checks when practical, usually `npm run build` if available or targeted tests from `server/`.

## Backend Guardrails

- Do not put business logic in route files.
- Do not let controllers own Prisma query details for new complex behavior.
- Do not trust client-provided IDs, roles, membership, or ownership.
- Do not expose raw database errors, stack traces, tokens, password hashes, or sensitive payloads.
- Do not hand-edit generated Prisma client files.
