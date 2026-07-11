# Frontend Skill

Use this skill when working on Sprintly frontend code under `client/`, including routes, React components, UI styling, client-side state, service calls from the browser, and frontend tests.

## Required Context

Read these files before making frontend changes:

1. `docs/frontend-rules-and-architecture.md`
2. The specific files in `client/` that the task touches

If a change affects backend API behavior or contracts, also read `server/src/docs/backend-rules-and-architecture.md`.

## Workflow

1. Identify the route, feature, page, component, hook, or service involved.
2. Keep feature-specific code inside `client/src/features/<feature>`.
3. Reuse UI primitives from `client/src/components/ui` before creating new controls.
4. Keep app shell pieces in `client/src/features/workspace`.
5. Keep cross-feature infrastructure in root global folders such as `services`, `stores`, `utils`, `styles`, and `config`.
6. Keep data operations in feature `services/` files.
7. Keep low-level request logic in `client/src/services/api-client.js`.
8. Add loading, empty, and error states for data-heavy UI.
9. Preserve the current React + Vite architecture unless the task explicitly asks for migration.
10. Run the relevant frontend checks when practical, usually `npm.cmd run lint` and `npm.cmd run build` from `client/`.

## Frontend Guardrails

- Do not introduce Next.js-only patterns into the current Vite app.
- Do not call backend endpoints directly from scattered components when a feature service exists.
- Do not create broad redesigns for narrow functional changes.
- Do not put feature-specific styles in global CSS unless the style is genuinely global.
- Keep responsive behavior and text overflow in mind for every changed screen.
- Keep imports aligned to `@/features/...` and root global folders such as `@/components`, `@/services`, `@/stores`, `@/utils`, and `@/config`.
