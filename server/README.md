# ZuzuPlan Backend

REST API for the ZuzuPlan task management system. Built with **Node.js**, **Express**, **PostgreSQL**, and **Prisma** (JavaScript).

## Setup

1. **Install dependencies**
   ```bash
   npm install
   ```

2. **Environment**
   - Copy `.env.example` to `.env`
   - Set `DATABASE_URL` to your PostgreSQL connection string, e.g.:
     ```
     DATABASE_URL="postgresql://user:password@localhost:5432/zuzuplan?schema=public"
     ```
   - Set `JWT_SECRET` and `JWT_REFRESH_SECRET` for auth

3. **Database**
   ```bash
   npx prisma generate
   npx prisma migrate dev --name init
   ```

4. **Run**
   ```bash
   npm run dev
   ```
   Server runs at `http://localhost:3000` (or `PORT` from env).

## API Overview

- **Auth**: `POST /api/auth/register`, `POST /api/auth/login`, refresh, logout, verify-email, forgot/reset password
- **Users**: `GET/PUT /api/users/me`, `GET /api/users/:id`
- **Projects**: CRUD at `/api/projects`, members at `/:id/members`, stats at `/:id/stats`
- **Tasks**: `/api/projects/:projectId/tasks` (CRUD, subtasks)
- **Comments**: `/api/tasks/:taskId/comments`
- **Attachments**: `/api/tasks/:taskId/attachments` (multipart upload)
- **Activity**: `/api/projects/:projectId/activity`
- **Labels**: `/api/projects/:projectId/labels`
- **Notifications**: `/api/notifications`

Protected routes require header: `Authorization: Bearer <accessToken>`.

See project root `BACKEND.md` for full API and data model details.
