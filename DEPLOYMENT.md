# Sprintly Deployment

This project is split into a Vite React frontend (`client`) and an Express API (`server`). Use Vercel for the frontend, Render free web service for the API, and Supabase PostgreSQL for the database.

## Frontend Environment

Set this in Vercel for the frontend project:

```env
VITE_API_URL=https://YOUR_RENDER_SERVICE.onrender.com/api
```

The frontend includes `client/vercel.json` so direct refreshes route back to `index.html`.

## Backend Environment

Set these in Render for the API service:

```env
NODE_ENV=production
PORT=10000
DATABASE_URL=postgresql://USER:PASSWORD@HOST:5432/postgres?sslmode=require
CLIENT_URL=https://YOUR_VERCEL_APP.vercel.app
CORS_ORIGINS=https://YOUR_VERCEL_APP.vercel.app
JWT_SECRET=generate-a-long-random-value
JWT_REFRESH_SECRET=generate-a-different-long-random-value
JWT_ACCESS_EXPIRES_IN=15m
JWT_REFRESH_EXPIRES_IN=7d
JWT_REFRESH_EXPIRES_MS=604800000
BREVO_API_KEY=your-brevo-api-key
BREVO_SENDER_EMAIL=noreply@example.com
BREVO_SENDER_NAME=Sprintly
UPLOAD_DIR=/tmp/sprintly-uploads
AVATAR_MAX_FILE_SIZE=2097152
```

## Email

Sprintly sends transactional email through Brevo's Email API. Create a Brevo API key in the Brevo dashboard, verify the sender identity or sending domain, and set `BREVO_API_KEY`, `BREVO_SENDER_EMAIL`, and optionally `BREVO_SENDER_NAME` on the Render service. The server validates these settings on startup and uses the same Brevo sender for verification, password reset, and invitation emails.

## Database

Use a Supabase PostgreSQL connection string with SSL enabled. For a long-running Render web service, prefer Supabase's session pooler connection string if direct IPv6 connectivity is not available.

Run migrations from the `server` folder after `DATABASE_URL` is set:

```bash
npm ci
npm run prisma:generate
npx prisma migrate deploy
npm run db:seed
```

## Uploads

Avatar uploads are stored on local server disk. The free Render instance can serve uploads during a running instance, but files are not durable across rebuilds/restarts. Durable uploads require moving avatar storage to Supabase Storage or another object store.
