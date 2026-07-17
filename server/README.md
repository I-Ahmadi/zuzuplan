# Sprintly Backend

REST API for the Sprintly task management system. Built with **Node.js**, **Express**, **PostgreSQL**, and **Prisma** (JavaScript).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` to your PostgreSQL connection string with SSL in production, e.g.:
     ```
     DATABASE_URL="postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require"
     ```
   - Set `CLIENT_URL`, `CORS_ORIGINS`, `JWT_SECRET`, and `JWT_REFRESH_SECRET` for auth and browser access

3. **Database**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Run**
   ```bash
   npm run dev
   ```
   Server runs on `PORT` from env, or `3000` when unset.

## API Overview

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, refresh, logout, verify-email, forgot/reset password
- **Users**: `GET/PUT /api/users/me`, `GET /api/users/:id`
- **Projects**: CRUD at `/api/projects`, members at `/:id/members`, invites at `/:id/invites`
- **Tasks**: `/api/projects/:projectId/tasks` (CRUD)
- **Comments**: `/api/tasks/:taskId/comments`

Protected routes require header: `Authorization: Bearer <accessToken>`.

See project root `BACKEND.md` for full API and data model details.

## Render deployment

Create a Render Web Service from the GitHub repository with these settings:

- Root Directory: `server`
- Runtime: `Node`
- Build Command: `npm ci && npm run build`
- Start Command: `npm start`
- Health Check Path: `/health`

Set production secrets in Render's Environment settings. Do not commit `.env`.
Render supplies `PORT` automatically; the server falls back to `3000` locally.
