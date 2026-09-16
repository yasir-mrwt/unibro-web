# UniBro

UniBro is a full-stack digital campus workspace for finding and sharing academic resources, connecting with a semester community, and locating faculty information. It combines a focused student interface with moderated uploads and role-based administration.

## Overview

Students select a department and semester, browse approved notes and coursework, preview or download files, contribute their own material, and join an authenticated real-time room. Staff records and resource submissions are managed through the same product design system.

## Features

- Local accounts, Google OAuth, email verification, and password recovery
- Department- and semester-aware resource discovery
- Search, category and year filters, sorting, previews, and downloads
- Authenticated uploads with server-side validation and moderation
- Personal upload history with pending, approved, and rejected states
- JWT-authenticated Socket.IO community rooms with typing and presence
- Searchable faculty/staff directory
- Profile, email, password, and verification management
- Resource moderation, user visibility, and staff administration
- Responsive light/dark interface with keyboard and reduced-motion support

## Main Workflows

1. Select a department and semester to create a persistent study context.
2. Browse a resource category, search results, and open the inline preview.
3. Sign in and verify an email address to upload or participate in chat.
4. Track uploads in **My uploads** while an administrator reviews them.
5. Use **Community** for the authenticated room matching the current context.

## Tech Stack

### Frontend

React 19, Vite, React Router, Tailwind CSS, Lucide icons, and Socket.IO Client.

### Backend

Node.js 20+, Express 5, Mongoose, JWT, Passport Google OAuth, Socket.IO, Helmet, rate limiting, Multer, and express-validator.

### Services

- MongoDB Atlas for application data
- Supabase Storage for resource files and optional staff images
- Mailjet for verification, password, and moderation email
- Google OAuth for federated sign-in

## Architecture

```text
Browser (React/Vite on Vercel)
           │ REST + authenticated Socket.IO
           ▼
Express/Socket.IO API (Render)
     ├── MongoDB Atlas
     ├── Supabase Storage
     ├── Mailjet
     └── Google OAuth
```

The browser receives only the public backend origin. Storage service credentials and all other secrets remain on the backend.

## Repository Structure

```text
frontend/   React SPA, Vercel routing, sitemap, and robots handlers
backend/    Express API, Socket.IO server, data models, and tests
render.yaml Reproducible Render web-service configuration
```

## Local Development

### Prerequisites

- Node.js 20 or newer
- npm
- Access to the existing MongoDB, Supabase, Mailjet, and Google projects

Install dependencies and create local environment files:

```bash
cd backend
npm install
cp .env.example .env

cd ../frontend
npm install
cp .env.example .env
```

Complete both `.env` files, then run the apps in separate terminals:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

The default local origins are `http://localhost:5001` for the API and `http://localhost:5173` for the frontend.

## Environment Variables

### `frontend/.env`

| Variable       | Purpose                                                                  |
| -------------- | ------------------------------------------------------------------------ |
| `VITE_API_URL` | Absolute public origin of the Express API; no trailing path is required. |

`VITE_` values are public browser configuration and must never contain secrets.

### `backend/.env`

| Variable               | Purpose                                                           |
| ---------------------- | ----------------------------------------------------------------- |
| `PORT`                 | Local/server port; Render supplies this automatically.            |
| `NODE_ENV`             | `development`, `test`, or `production`.                           |
| `FRONTEND_URL`         | Exact frontend origin allowed by REST and Socket.IO CORS.         |
| `MONGO_URI`            | Existing MongoDB Atlas connection string.                         |
| `JWT_SECRET`           | Strong signing secret; at least 32 characters in production.      |
| `JWT_EXPIRE`           | JWT lifetime, for example `7d`.                                   |
| `GOOGLE_CLIENT_ID`     | Google OAuth client ID.                                           |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret.                                       |
| `GOOGLE_CALLBACK_URL`  | Absolute backend callback ending in `/api/auth/google/callback`.  |
| `MAILJET_API_KEY`      | Mailjet API key.                                                  |
| `MAILJET_SECRET_KEY`   | Mailjet secret key.                                               |
| `MAILJET_SENDER_EMAIL` | Verified Mailjet sender address.                                  |
| `MAILJET_SENDER_NAME`  | Optional sender display name.                                     |
| `SUPABASE_URL`         | Existing Supabase project URL.                                    |
| `SUPABASE_SERVICE_KEY` | Backend-only Supabase service-role key.                           |
| `SUPABASE_BUCKET`      | Public storage bucket name; the expected value is `unibro-files`. |

Production startup validates every integration variable without printing its value.

## Tests and Build

```bash
cd backend
npm test
npm audit

cd ../frontend
npm run lint
npm run build
npm audit
```

Backend tests use an isolated in-memory MongoDB and mocked email/storage providers. They do not alter production data.

## Deployment Architecture

### Frontend: Vercel

Import the monorepo with **Root Directory** set to `frontend`. Use the Vite defaults (`npm run build`, output `dist`) and set `VITE_API_URL` to the Render API origin. `vercel.json` handles SPA refreshes plus dynamic sitemap and robots routes.

### Backend: Render

`render.yaml` defines a long-running Node web service with `backend` as its root, `npm ci` as the build command, `npm start` as the start command, and `/api/health` as its health check. Add the secret environment values in Render before the first deployment.

After both URLs are known:

1. Set backend `FRONTEND_URL` to the exact Vercel production origin.
2. Set frontend `VITE_API_URL` to the exact Render origin.
3. Register the Render Google callback URL in Google Cloud and set `GOOGLE_CALLBACK_URL` to the same value.
4. Confirm the Supabase bucket is public for read/preview access while write/delete access remains backend-only.

## Security Notes

- API and Socket.IO identity comes from bearer JWTs, never client-supplied user data.
- Upload type and size rules are enforced on the server before storage.
- Service-role, database, OAuth, email, and JWT secrets stay outside source control.
- CORS uses an exact configured frontend origin in production.
- Admin, verification, ownership, and room authorization are enforced server-side.

## Project Status

The repository is prepared for Vercel + Render deployment, but deployment is intentionally not performed from this branch. A valid existing Supabase project URL and key are required before uploads and storage-backed deletions can pass live verification.
