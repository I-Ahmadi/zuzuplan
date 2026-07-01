# Sprintly Frontend Rules and Architecture

Use this document for work under `client/`, including routes, UI, state, styling, browser integrations, frontend API calls, and frontend tests.

## Current Stack

- React 18
- Vite
- React Router
- Tailwind CSS
- ShadCN-style UI primitives
- TanStack Query
- JavaScript and JSX in the current implementation

The previous target architecture referenced Next.js App Router. Treat that as a future migration direction, not the current implementation baseline.

## Current Folder Structure

```txt
client/
  src/
    App.jsx
    main.jsx
    components/
      auth/
      board/
      providers/
      search/
      tasks/
      ui/
    contexts/
    hooks/
    lib/
    pages/
    styles/
  index.html
  package.json
  vite.config.js
```

## Frontend Principles

- Build by feature and user workflow.
- Keep page components focused on route composition and route-level data needs.
- Keep reusable controls in `src/components/ui`.
- Keep app shell pieces in `src/components/board` or another clearly named layout folder.
- Keep API access in `src/lib/*-api.js` or a clearly named service module.
- Do not call `fetch` directly from random components when an API helper exists.
- Keep loading, empty, and error states intentional for every data-heavy view.
- Preserve the existing visual system unless the task is explicitly a redesign.

## Routing

- React Router routes are defined from `src/App.jsx`.
- Page-level screens live in `src/pages`.
- Route components should compose smaller components rather than accumulating all business logic.
- Keep auth-only, dashboard, and settings-style routes organized by user workflow.
- When a route represents a resource, keep parameter names consistent with backend route names, such as `projectId` and `taskId`.

## Component Organization

- `src/components/ui/`: reusable primitive components such as buttons, inputs, dialogs, tables, textareas, cards, selects, labels, avatars, and menus.
- `src/components/board/`: persistent app shell, sidebar, header, and board layout.
- `src/components/auth/`: auth-specific UI.
- `src/components/search/`: global search UI.
- `src/components/tasks/`: task-specific components.
- `src/pages/`: route-level page components.

When adding a new feature with several components, prefer:

```txt
src/components/<feature>/
  feature-panel.jsx
  feature-form.jsx
  feature-list.jsx
src/pages/FeaturePage.jsx
src/lib/feature-api.js
```

## API Integration

- Use the shared API helper in `src/lib/api.js` and `src/lib/api-helper.js` where possible.
- Keep resource-specific API functions in files like `task-api.js`, `project-api.js`, and `auth-api.js`.
- Normalize API errors before rendering them.
- Keep backend paths centralized in API modules so pages do not construct complex request details.
- Use TanStack Query for server state, mutations, caching, and invalidation.

Example pattern:

```js
import { apiRequest } from "./api";

export function listProjectTasks(projectId) {
  return apiRequest(`/projects/${projectId}/tasks`);
}
```

## State Management

- Server state: TanStack Query.
- URL state: React Router params and search params.
- Local UI state: `useState` or `useReducer`.
- Cross-cutting app state: focused context providers in `src/contexts`.
- Avoid adding global stores unless state is complex, shared broadly, and not server-derived.
- Keep cache keys predictable and colocated with the feature API or hook that owns them.

## Hooks, Utilities, Constants, and Types

- Generic hooks live in `src/hooks`.
- API helpers and utilities live in `src/lib`.
- Keep storage keys, issue constants, and similar shared constants in focused `src/lib/*` files.
- Avoid large unstructured utility files; split by concern when growth makes the file hard to scan.
- Prefer plain data transformation helpers over logic hidden inside UI components.

## Styling Conventions

- Use Tailwind CSS for layout and styling.
- Use the shared UI layer for repeated controls.
- Use the existing `cn()` utility for conditional class composition where available.
- Keep global CSS limited to variables, base styles, Tailwind layers, and app-level resets.
- Do not place feature-specific styling in global CSS unless it is truly global.
- Prefer semantic design tokens and existing CSS variables over one-off hard-coded colors.
- Keep cards, panels, forms, and tables visually consistent.
- Every interactive element needs an accessible focus state.

## Frontend UX Rules

- Data-heavy routes need loading, empty, and error states.
- Forms need inline validation feedback where the user can act on it.
- Use toasts or transient feedback for successful actions and non-blocking failures.
- Avoid exposing raw backend error details to users.
- Keep text inside buttons, cards, tabs, and controls from overflowing at mobile widths.
- Use semantic HTML and accessible labels.

## Environment Variables

- Vite-exposed variables must start with `VITE_`.
- Current API base URL:

```txt
VITE_API_URL=http://localhost:3000/api
```

- Keep frontend `.env.example` documentation synchronized when variables change.

## Naming Conventions

- Existing page components use `PascalCase.jsx`, for example `Projects.jsx`.
- Existing UI and feature component names are mixed; follow the local folder's pattern when editing.
- New low-level reusable files should prefer kebab case when it fits nearby code, for example `task-filter.jsx`.
- Hooks should be named `useSomething`.
- API modules should use `<resource>-api.js`.
- Constants should use clear names; exported constants can use `SCREAMING_SNAKE_CASE`.

## Performance

- Keep heavy work out of render paths.
- Debounce search input and cancel or ignore stale requests.
- Paginate large lists and consider virtualization for very large tables.
- Keep provider boundaries narrow enough to avoid unnecessary app-wide rerenders.
- Use dynamic imports for unusually heavy client-only components.
- Track production bundle size when adding large dependencies.

## Testing

Preferred structure when tests are added:

```txt
client/src/components/<feature>/__tests__/
client/src/hooks/__tests__/
client/src/lib/__tests__/
client/tests/e2e/
```

Rules:

- Unit test pure utilities, hooks, and complex component behavior.
- Integration test user flows that span forms, API calls, and route behavior.
- E2E test critical flows such as signup, login, project creation, task lifecycle, and invite acceptance.
- Mock external services, not internal business logic.
- Add regression tests for bug fixes.

## Next.js Migration Note

If the team intentionally migrates to Next.js:

- Move route pages from `src/pages` into `app/` route segments.
- Move shared UI from `src/components/ui` into `components/ui`.
- Move domain components into `features/<feature>/components`.
- Move API helpers from `src/lib/*-api.js` into typed `features/<feature>/services`.
- Replace React Router routes with App Router folders.
- Replace `VITE_API_URL` with `NEXT_PUBLIC_API_URL`.
- Keep TanStack Query for client-side server state where it still adds value.
