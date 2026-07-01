# Frontend Skill

Use this skill when working on Sprintly frontend code under `client/`, including routes, React components, UI styling, client-side state, API calls from the browser, and frontend tests.

## Required Context

Read these files before making frontend changes:

1. `../../../../PROJECT_RULES_AND_ARCHITECTURE.md` from the repository root
2. `../../../../docs/frontend-rules-and-architecture.md` from the repository root
3. The specific files in `client/` that the task touches

If a change affects backend API behavior or contracts, also read `../../../../docs/backend-rules-and-architecture.md` from the repository root.

## Workflow

1. Identify the route, page, component, hook, or API helper involved.
2. Reuse existing UI primitives from `client/src/components/ui` before creating new controls.
3. Keep page components focused on composition and route-level behavior.
4. Keep API calls in `client/src/lib/*-api.js` or a clearly named helper.
5. Add loading, empty, and error states for data-heavy UI.
6. Preserve the current React + Vite architecture unless the task explicitly asks for migration.
7. Run the relevant frontend checks when practical, usually `npm run build` from `client/`.

## Frontend Guardrails

- Do not introduce Next.js-only patterns into the current Vite app.
- Do not call backend endpoints directly from scattered components when an API helper exists.
- Do not create broad redesigns for narrow functional changes.
- Do not put feature-specific styles in global CSS unless the style is genuinely global.
- Keep responsive behavior and text overflow in mind for every changed screen.
