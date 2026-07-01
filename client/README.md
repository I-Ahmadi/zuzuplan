# Sprintly Frontend

Sprintly's frontend runs as a standard React 18 application powered by Vite.

## Stack

- React 18
- Vite
- React Router
- Tailwind CSS
- ShadCN UI
- TanStack React Query

## Commands

```bash
npm install
npm run dev
```

The Vite dev server runs at `http://localhost:5173` by default.

- `npm run dev` - start the development server
- `npm run build` - create a production build
- `npm run preview` - preview the production build locally
- `npm run lint` - run ESLint

## Environment

- `VITE_API_URL` - backend API base URL, for example `http://localhost:3000/api`

## Project layout

- `src/App.jsx` - route definitions and app shell
- `src/main.jsx` - React entrypoint
- `src/pages/` - route-level page components
- `src/components/` - shared UI and layout components
- `src/contexts/` - React context providers
- `src/hooks/` - reusable hooks
- `src/lib/` - API helpers and utilities
- `src/styles/` - global styles
