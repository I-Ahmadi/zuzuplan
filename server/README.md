# Sprintly Backend

REST API for the Sprintly task management system. Built with **Node.js**, **Express**, **PostgreSQL**, and **Prisma** (JavaScript).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` to your local PostgreSQL database, e.g.:
     ```
     DATABASE_URL="postgresql://postgres:postgres@localhost:5432/sprintly"
     ```
   - Set `JWT_SECRET` and `JWT_REFRESH_SECRET` for local authentication

3. **Database**

   From the project root, start the included PostgreSQL container:
   ```bash
   docker compose up -d postgres
   ```

   Then apply the existing migrations:
   ```bash
   npm run prisma:generate
   npm run db:setup
   ```

4. **Run**
   ```bash
   npm run dev
   ```
   Server runs on `PORT` from env, or `3000` when unset.

   Verification, password-reset, and invitation emails are printed in the server terminal for local testing.

## API Overview

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, refresh, logout, verify-email, forgot/reset password
- **Users**: `GET/PUT /api/users/me`, `GET /api/users/:id`
- **Projects**: CRUD at `/api/projects`, members at `/:id/members`, invites at `/:id/invites`
- **Tasks**: `/api/projects/:projectId/tasks` (CRUD)
- **Comments**: `/api/tasks/:taskId/comments`

Protected routes require header: `Authorization: Bearer <accessToken>`.

See project root `BACKEND.md` for full API and data model details.
