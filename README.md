# UniBro

UniBro is a digital campus workspace organized around a student's department and semester. Students can find approved notes, assignments, past papers, projects, presentations, and quizzes; contribute resources for moderation; join their authenticated academic community; and browse faculty information.

## Product areas

- Public, brand-led product site with focused sign-in and registration flows
- Department and semester onboarding before entering the student application
- Overview dashboard with resource shortcuts, recent material, uploads, and community entry points
- Dedicated resource discovery with search, categories, year filters, sorting, preview, and download
- Moderated resource uploads and personal submission status
- JWT-authenticated Socket.IO rooms with typing, shared Mongo-backed presence, reconnect/rejoin, and authorized deletion
- Searchable staff directory, profile/security settings, and role-protected administration

## Stack and architecture

- **Frontend:** React 19, Vite, React Router, Socket.IO Client, local open-source Fraunces and Manrope fonts
- **Backend:** Node.js 22+ (containers and CI use Node 24), Express 5, Mongoose, Socket.IO, Passport, JWT, Helmet, rate limiting, and Multer
- **Services:** MongoDB Atlas, Supabase Storage, Mailjet, and Google OAuth
- **Deployment:** separate frontend and backend Vercel projects; Docker images and Docker Compose are also maintained

```text
Browser — https://unibro-frontend-one.vercel.app
   │ REST + authenticated Socket.IO
   ▼
API — https://unibro-backend.vercel.app
   ├── MongoDB Atlas (data, Socket.IO adapter, shared presence)
   ├── Supabase Storage
   ├── Mailjet
   └── Google OAuth
```

Only `VITE_API_URL` is exposed to the browser. Database, storage service-role, OAuth, email, and JWT secrets stay in the backend environment.

## Repository layout

```text
frontend/             React SPA, Vercel routes, and visual review
backend/              Express/Socket.IO service and integration tests
.github/workflows/    lint, test, build, audit, and Docker CI
docker-compose.yml    local production-style stack
```

## Local development

Requirements: Node.js 22.12 or newer, npm, and access to the configured service projects.

```bash
cd backend
npm ci
cp .env.example .env

cd ../frontend
npm ci
cp .env.example .env
```

Complete both environment files, then run each app in its own terminal:

```bash
cd backend && npm run dev
cd frontend && npm run dev
```

The defaults are `http://localhost:5001` for the API and `http://localhost:5173` for Vite.

## Environment

### Frontend

| Variable | Required value/purpose |
| --- | --- |
| `VITE_API_URL` | Absolute public backend origin. Production: `https://unibro-backend.vercel.app` |

All `VITE_` values are public. Never place secrets in them.

### Backend

| Variable | Purpose |
| --- | --- |
| `NODE_ENV` | `development`, `test`, or `production` |
| `PORT` | HTTP port; defaults to `5001` locally |
| `FRONTEND_URL` | Primary exact browser origin. Production: `https://unibro-frontend-one.vercel.app` |
| `CORS_ORIGINS` | Optional comma-separated additional exact origins, such as stable preview aliases |
| `MONGO_URI` | MongoDB connection string |
| `JWT_SECRET` | Signing secret; at least 32 characters in production |
| `JWT_EXPIRE` | Token lifetime, for example `7d` |
| `GOOGLE_CLIENT_ID` | Google OAuth client ID |
| `GOOGLE_CLIENT_SECRET` | Google OAuth client secret |
| `GOOGLE_CALLBACK_URL` | Production: `https://unibro-backend.vercel.app/api/auth/google/callback` |
| `MAILJET_API_KEY` | Mailjet API key |
| `MAILJET_SECRET_KEY` | Mailjet secret key |
| `MAILJET_SENDER_EMAIL` | Active verified sender |
| `MAILJET_SENDER_NAME` | Optional sender label; defaults to `UniBro` |
| `SUPABASE_URL` | Supabase project URL |
| `SUPABASE_SERVICE_KEY` | Backend-only service-role key |
| `SUPABASE_BUCKET` | Public resource bucket; normally `unibro-files` |

Origins are trimmed and normalized to their URL origin. The API uses an exact allowlist—never a wildcard—and the same source configures Express and Socket.IO. `FRONTEND_URLS` remains accepted only as a compatibility alias; new deployments should use `CORS_ORIGINS`.

## Verification

```bash
cd frontend
npm run lint
npm test
npm run build
npm audit --audit-level=high

cd ../backend
npm run check
npm test
npm audit --audit-level=high
```

With a frontend dev server running, `npm run test:visual` in `frontend` checks the key public and authenticated routes across desktop, tablet, and mobile viewports and writes review screenshots to `/tmp`.

`npm run test:external` in `backend` performs live provider checks, including a disposable Supabase upload/download/delete cycle. Run it only against the intended environment. Backend unit and integration tests use isolated or mocked providers and do not alter production data.

## Docker

Copy and complete the environment files first, then run:

```bash
docker compose up --build
```

The production-style frontend is served at `http://localhost:8080` and the backend at `http://localhost:5001`. Ports can be changed with `FRONTEND_PORT` and `BACKEND_PORT`; the frontend build target can be set with `VITE_API_URL`. `backend/Dockerfile.vercel` is the backend Vercel container entry.

## Vercel deployment

Create two Vercel projects from this repository. Deployment itself is intentionally not performed by CI.

### Frontend project

- Root Directory: `frontend`
- Framework: Vite
- Build command: `npm run build`
- Output directory: `dist`
- Production variable: `VITE_API_URL=https://unibro-backend.vercel.app`

### Backend project

- Root Directory: `backend`
- Container entry: `Dockerfile.vercel`
- Health endpoint: `/api/health`
- Production variable: `FRONTEND_URL=https://unibro-frontend-one.vercel.app`
- Optional preview allowlist: set `CORS_ORIGINS` only to the exact stable preview origins that should be trusted
- Set every secret backend variable listed above for the **Production** environment, not only Preview
- Register `https://unibro-backend.vercel.app/api/auth/google/callback` as an authorized Google OAuth redirect URI and use that same value for `GOOGLE_CALLBACK_URL`

If `unibro-backend.vercel.app` returns Vercel's platform `NOT_FOUND` response, the request has not reached Express and CORS changes cannot repair it. Link the hostname to the correct backend project/Production deployment, confirm the backend Root Directory and container entry, then redeploy. Verify afterward:

```bash
curl -i https://unibro-backend.vercel.app/api/health

curl -i -X OPTIONS \
  https://unibro-backend.vercel.app/api/resources \
  -H 'Origin: https://unibro-frontend-one.vercel.app' \
  -H 'Access-Control-Request-Method: GET' \
  -H 'Access-Control-Request-Headers: authorization,content-type'

curl -i https://unibro-backend.vercel.app/api/resources \
  -H 'Origin: https://unibro-frontend-one.vercel.app'
```

The preflight should return `204` with the exact frontend `Access-Control-Allow-Origin`, required methods and headers. Health and resources should return application responses, not a Vercel platform error.

## Security boundaries

- REST and Socket.IO identities come from signed bearer tokens, not client-provided user identities.
- Route guards improve navigation, while backend authorization remains authoritative.
- Upload size, MIME/type, ownership, verification, moderation, and admin rules are enforced server-side.
- CORS permits only explicitly configured origins; non-browser requests without an Origin remain supported.
- Supabase service-role, MongoDB, Mailjet, Google, and JWT secrets are excluded from source control.
