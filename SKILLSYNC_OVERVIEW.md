# SkillSync — Application Overview

> Handoff document: architecture, data, public API surface, security, and
> **inter-service contracts** after the backend was split into the gateway +
> services (2026 refactor). For decision history see `docs/adr/0001-microservices-split.md`.

SkillSync is an **AI-powered recruitment platform**. It has two sides:

- **Candidates (role: `user`)** — browse jobs, apply with a resume, track application status, see AI-generated ATS match scores.
- **Recruiters (role: `admin`)** — create/manage jobs, view applicants ranked by ATS score, schedule interviews, and view dashboards/analytics.

The repo ships a **Vite SPA** (`client/`) and a **decomposed backend**: an API **gateway** (`gateway/`) on port 5000 proxies to services under `services/` (auth, jobs, applications, resume-analysis, search, dashboard). The legacy single `server/` app has been **removed** (Phase 10); there is still no message broker; ATS scoring runs in `resume-analysis-service` with callbacks to `applications-service`.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [High-Level Architecture (today)](#2-high-level-architecture-today)
3. [Backend folder layout (monorepo)](#3-backend-folder-layout-monorepo)
4. [Data model (MongoDB collections)](#4-data-model-mongodb-collections)
5. [REST API (via gateway)](#5-rest-api-via-gateway)
6. [Where the logic lives now](#6-where-the-logic-lives-now)
7. [Security model](#7-security-model)
8. [External dependencies](#8-external-dependencies-the-outside-the-box-surface)
9. [Frontend folder layout](#9-frontend-folder-layout)
10. [Cross-cutting contracts](#10-cross-cutting-contracts)
11. [Implemented service map](#11-implemented-service-map)
12. [Quick reference](#12-quick-reference)

---

## 1. Tech Stack

### Shared (`shared/` → npm `@skillsync/shared`)
- **Runtime**: Node.js 22+ recommended, ES modules
- **DB helper**: `connectDB` / Mongoose for services that own data
- **Cross-cutting**: Winston logger factory, `ApiError` / `ApiResponse`, `catchAsync`, JWT verify helpers, `requireInternal` / auth-related middlewares, `sanitizeObjectId` and other query sanitizers from `shared/security`

### Per-service backends (`gateway/`, `services/*`)
Each service is its own Express app with `helmet`, `cors`, `cookie-parser` + `JWT_SECRET` where cookies are used (e.g. auth), and service-specific deps:

| Area | Typical packages | Lives in |
|------|-------------------|----------|
| Auth / users | `mongoose`, `google-auth-library`, `jsonwebtoken`, JWT | `services/auth` |
| Jobs | `mongoose`, job CRUD + internal read/search helpers | `services/jobs` |
| Applications + candidates | `mongoose`, `multer`, AWS S3, `@skillsync/shared/gemini` (admin bulk resume scoring), internal routes for ATS + dashboard reads | `services/applications` |
| Resume analysis | `pdf-parse`, `mammoth`, `@skillsync/shared/gemini` (ATS; HTTP back to applications) | `services/resume-analysis` |
| Search | `mongoose` read-only models on `jobs` + `candidates` collections | `services/search` |
| Dashboard | HTTP clients only (no Mongo in-process) | `services/dashboard` |
| Gateway | `http-proxy-middleware`, `express-rate-limit` | `gateway` |

### Frontend (`client/`)
- **Framework**: React 18 + TypeScript + Vite (port 3000)
- **Routing**: React Router DOM v6
- **UI**: Tailwind CSS + Radix UI + Tabler/Lucide icons + `recharts`
- **Forms/validation**: `react-hook-form` + `zod`
- **State**: Context API (`AuthContext`, `DashboardContext`)
- **HTTP**: Custom fetch wrapper in `client/src/lib/apiClient.ts` — caching, request deduplication, JWT auth

### Process orchestration (root `package.json`)
- `concurrently` runs **client** (3000), **gateway** (5000), and all **services** via `npm run dev`.
- **Docker**: `docker-compose.yml` + root `Dockerfile` (`npm run dev:docker`, `npm run smoke`). See repo **README.md**.

---

## 2. High-Level Architecture (today)

```
[ React SPA :3000 ]
       |  HTTP/JSON  (apiClient → http://localhost:5000/api/…)
       v
[ Gateway :5000 ] ──proxy──> [ auth:5001 ] [ jobs:5002 ] [ applications:5003 ]
       |                                         |              |
       |                                         +--> MongoDB (users, jobs, …)
       |                                         |
       +──────────────proxy────────────────────> [ search:5005 ] [ dashboard:5006 ]
       |                                         (read Mongo)   (HTTP aggregate)
       +──────────────proxy────────────────────> [ resume-analysis:5004 ]
                                                     └──> Groq; PATCH applications internal
```

- **Ingress**: only the **gateway** is exposed to the browser on **5000** for `/api/*` (plus gateway `/health`).
- **MongoDB**: auth, jobs, applications, and search connect with `MONGODB_URI`; resume-analysis does not own the `applications` collection.
- **S3 / Groq**: used from **applications** (resumes, candidate bulk flow) and **resume-analysis** (parse + score pipeline) per ADR.
- Vite still targets **`http://localhost:5000`** for API calls (`client` config / hardcoded URLs in some components).
- **CORS**: `ALLOWED_ORIGINS` on each service + gateway.

---

## 3. Backend folder layout (monorepo)

```
shared/src/                    # @skillsync/shared — logger, db, jwt, middleware, security, constants
gateway/src/
├── loadEnv.js                 # Loads repo root .env
└── server.js                  # CORS, helmet, rate limit, proxies

services/<name>/src/
├── loadEnv.js                 # Repo root .env (path ../../../.env from service src)
├── app.js                     # Express stack + /health + routes + internal routes where applicable
├── server.js                  # listen(PORT), connectDB() if service owns Mongo
├── config/envValidation.js
├── routes/                    # HTTP routes for that bounded context
├── controllers/, services/, models/   # as needed per service
├── middleware/                # auth, upload, …
└── utils/
```

Gateway **does not** mount business routes; it forwards path prefixes to the owning service (see §11).

---

## 4. Data Model (MongoDB collections)

| Collection | Purpose | Key fields |
|---|---|---|
| `users` | Account + auth | `fullName`, `email` (unique), `password` (bcrypt-hashed), `role: 'admin'\|'user'`, `profilePhotoUrl`, `profilePhotoKey`, `resetPasswordOTP`, `resetPasswordOTPExpires` |
| `jobs` | Job postings | `title`, `location`, `workType`, `status: draft\|active\|closed`, `summary`, `keyResponsibilities`, `requiredSkills`, `preferredSkills`, `aboutCompany`, `compensation`, legacy `description`/`requirements`, `keywords[]`, `searchableTitle`. Mongo **text index** on title/location/description/requirements/keywords. |
| `applications` | Candidate-applies-to-job (the main user flow) | `userId→User`, `jobId→Job`, `candidateInfo {name,email}`, `resume {fileUrl,s3Key,fileName,fileType,fileSize,uploadedAt}`, `atsScore {score,analyzedAt,status: pending\|processing\|completed\|failed,error,breakdown,matchSummary}`, `status: applied\|withdrawn\|Under Review\|Shortlisted\|Rejected\|Hired`, `appliedAt`, `withdrawnAt`. Unique index `{userId,jobId}`. |
| `candidates` | Admin-uploaded resumes (separate flow from `applications`) | `jobId`, `name`, `email`, `atsScore`, `matchExplanation`, `resumeText`, `resumeUrl`, `callScheduled`, `skills[]`. Has its own text index. |
| `tokenblacklists` | Revoked JWTs (after logout) | `token`, `userId`, `reason`, TTL'd by JWT expiry. |

> Note: Two parallel flows remain — **`applications`** (user applies to a job) and **`candidates`** (admin bulk upload per job), both owned by **applications-service**.

---

## 5. REST API (via gateway)

All paths below are under **`http://<gateway>:5000/api/...`**. The gateway (`gateway/src/server.js`) proxies:

| Prefix | Upstream |
|--------|----------|
| `/api/auth`, `/api/users` | auth-service |
| `/api/jobs` | jobs-service |
| `/api/applications`, `/api/candidates` | applications-service |
| `/api/search` | search-service |
| `/api/dashboard`, `/api/analytics` | dashboard-service |

Implemented locally on the gateway (not proxied): **`GET /health`**.

### `/api/auth` (auth-service)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/google` | – | Body `{ credential }` (Google ID token). Returns `{ accessToken, user }` or `{ needsOnboarding, tempToken }` |
| POST | `/onboarding` | short-lived JWT | `Authorization: Bearer <tempToken>`; body `{ role, profile }`. Creates user; returns `{ accessToken, user }` |
| POST | `/logout` | JWT | Blacklists current token |
| GET  | `/me` | JWT | Current user |

### `/api/jobs` (jobs-service)
- `GET /`, `GET /search`, `GET /:id` — public
- `POST /`, `PUT /:id`, `DELETE /:id` — admin + JWT

### `/api/applications` (applications-service)
- `POST /job/:jobId/apply` — JWT + multer upload `resume`. Triggers ATS via **HTTP** to `resume-analysis-service` (fire-and-forget), which **PATCH**es applications internal routes when done.
- `DELETE /job/:jobId/withdraw` — JWT
- `GET /job/:jobId/status`, `GET /my-applications` — JWT
- Admin: `GET /job/:jobId/all`, `GET /resume/:applicationId` (returns S3 pre-signed URL, 1h), `POST /:id/retry-analysis`, `GET /:id/ats-status`, `PATCH /:id/status`

### `/api/candidates` (applications-service)
- `GET /job/:id` — list candidates for a job
- `POST /job/:id/upload` — admin uploads up to 5 PDFs; runs Groq scoring **synchronously** and writes `Candidate` docs
- `POST /:id/schedule` — admin marks interview scheduled

### `/api/search` (search-service)
`/jobs`, `/candidates`, `/unified`, `/suggestions/jobs`, `/suggestions/candidates`

### `/api/dashboard` (dashboard-service)
- `GET /stats` — JWT, role-aware (admin vs user); aggregates **internal HTTP** to jobs + applications
- `GET /admin`, `GET /user` (legacy-style payloads)
- `GET /user-stats` — compact candidate stats (includes real **`interviewsScheduled`** when matched to `Candidate` rows)

### `/api/analytics` (dashboard-service)
- `GET /` — JWT, jobs-created-per-day for ranges `7d`/`30d`/`90d`

### `/api/users` (auth-service)
- `GET /profile`, `PUT /profile` — JWT (profile photo is Google `picture` URL on the user document, not S3)

### Health
- **`GET /health`** — gateway only (JSON includes upstream hints).

Internal-only examples (not browser-facing): `GET/POST /api/internal/...` on auth, jobs, applications (see each service’s `internalRoutes` / `jobInternalReadService` / `internalReadService`).

---

## 6. Where the logic lives now

| Concern | Location (illustrative) |
|---------|-------------------------|
| Google ID token verify, JWT + blacklist, user profile | `services/auth` |
| Job CRUD, job internal reads (by id, dashboard stats, analytics series) | `services/jobs` |
| Applications + candidates, S3 resume lifecycle, ATS trigger to worker, internal ATS + dashboard reads for other services | `services/applications` |
| PDF/DOCX text extraction, Groq scoring, PATCH back to applications | `services/resume-analysis` |
| Full-text / unified search across Mongo `jobs` + `candidates` | `services/search` |
| Dashboard + analytics aggregation over HTTP to jobs/applications + auth for JWT user | `services/dashboard` |
| Proxy table, rate limit | `gateway` |

**Resume text** is still processed only in memory inside **resume-analysis-service** and is not stored as a long-lived field in Mongo.

If you add a **message broker** later, replace the “HTTP POST to resume-analysis” fire-and-forget path from applications with a consumer — contract stays: worker updates ATS fields on the application document via applications internal API.

---

## 7. Security Model

- **JWT** — `Authorization: Bearer <accessToken>`. Each service verifies signatures with **`JWT_SECRET`**. Blacklist checks for browser traffic go through **auth-service** (see gateway / auth integration). `requireAdmin` patterns live on the owning service.
- **Rate limiting** — **`express-rate-limit`** on the gateway for `/api`; auth-service limits `/google` and `/onboarding` in production.
- **Validation** — per-service (e.g. **jobs** / **applications**) as ported from the monolith.
- **Input sanitization** — `@skillsync/shared/security` (`sanitizeObjectId`, search sanitizers, etc.) on user-controlled ids and query params.
- **Google Sign-In** — `GOOGLE_CLIENT_ID` on auth-service; browser uses the same Web client id via `VITE_GOOGLE_CLIENT_ID`.
- **Legacy password users** — optional `password` on `User` when `googleId` is absent; rules apply only if a password is set.
- **CORS allowlist** — `ALLOWED_ORIGINS=comma,separated,list`.
- **Helmet** — default security headers.
- **File uploads** — 10 MB cap, MIME-type filtered (PDF, DOCX).

---

## 8. External Dependencies (the "outside-the-box" surface)

| System | Used by | Env vars |
|---|---|---|
| **MongoDB** | auth, jobs, applications, search (each connects) | `MONGODB_URI` |
| **AWS S3** | applications (resumes); resume-analysis reads resumes from S3 | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME` |
| **Google Gemini** | resume-analysis (ATS), applications (candidate bulk scoring) | `GEMINI_API_KEY`, optional `GEMINI_MODEL` / `GEMINI_ATS_MODEL` / `GEMINI_CANDIDATE_MODEL` |
| **Google OAuth** | auth (`google-auth-library` verify) | `GOOGLE_CLIENT_ID` (same value as `VITE_GOOGLE_CLIENT_ID` in Vite) |
| **JWT** | all services that verify users | `JWT_SECRET`, `JWT_EXPIRES_IN` |
| **Internal HMAC** | service-to-service `fetch` clients | `INTERNAL_SERVICE_TOKEN` (+ optional `*_SERVICE_URL` overrides) |

> Heads-up: keep the repository root `.env` (gitignored) out of commits; it holds real credentials (Groq, AWS, etc.). Rotate any leaked keys before merging.

---

## 9. Frontend Folder Layout

```
client/src/
├── App.tsx                     # Routes, role-based layout switch
├── main.tsx                    # ReactDOM bootstrap
├── lib/apiClient.ts            # Central fetch wrapper (auth + cache + dedup)
├── context/AuthContext.tsx     # JWT in localStorage('token'), user object
├── contexts/DashboardContext.tsx
├── hooks/                      # useAuth, useApi, useApiCache
├── pages/                      # AuthPage, RegisterPage, OnboardingPage, ProfilePage, …
├── components/
│   ├── admin-dashboard/        # Admin layout, dashboard, analytics-chart, sidebars, section-cards
│   ├── user-dashboard/         # Candidate dashboard, section-cards
│   ├── dashboard/UserDashboard.tsx
│   ├── profile/                # Profile header, content, photo upload
│   ├── ui/                     # shadcn-style primitives (button, card, dialog, table, ...)
│   └── feature components      # JobsList, JobDetails, CreateJob, EditJobModal, ApplyModal,
│                               # ApplicantsList, ApplicationStatusDropdown, FilterPanel,
│                               # JobSearch, CandidateSearch, SearchResults
├── types/index.ts
└── index.css
```

The route tree in `client/src/App.tsx` switches **entire layouts based on role**:

- `admin` → `DashboardLayout` (full admin shell)
- `user`  → `UserLayout` (candidate shell)

The frontend is a stateless SPA; it reaches the backend purely through `apiClient` at `http://localhost:5000/api` (configurable).

---

## 10. Cross-cutting contracts

1. **Browser traffic** — SPA uses `Authorization: Bearer <jwt>` on protected and mutating routes through the gateway.
2. **Role enforcement** — `admin` vs `user` is enforced in **service** code from JWT claims after `verifyToken`; never trust the client alone.
3. **ObjectId sanitization** — continue using **`sanitizeObjectId`** / shared security helpers on any user-controlled id before Mongo queries.
4. **Resume text** — parsed in **resume-analysis-service** memory only; not written as a durable resume body field in Mongo.
5. **Duplicate applies** — unique `{userId, jobId}` on `applications` plus withdraw/reapply rules in **applications-service** `ApplicationService`.
6. **Service-to-service** — `X-Internal-Token: INTERNAL_SERVICE_TOKEN` on `*/api/internal/*` routes.

---

## 11. Implemented service map

Aligned with [ADR 0001](./docs/adr/0001-microservices-split.md):

| Deployable | Port | Owns / proxies |
|------------|------|------------------|
| **Gateway** | 5000 | Proxies table in §5; `GET /health`, rate limit |
| **auth-service** | 5001 | `users`, `tokenblacklists`, `/api/auth/*`, `/api/users/*` |
| **jobs-service** | 5002 | `jobs`, `/api/jobs/*`, internal job reads |
| **applications-service** | 5003 | `applications`, `candidates`, `/api/applications/*`, `/api/candidates/*`, internal ATS + dashboard helpers |
| **resume-analysis-service** | 5004 | Worker: parse + Groq; PATCH applications internal ATS fields |
| **search-service** | 5005 | `/api/search/*` (read-only Mongo on `jobs` + `candidates`) |
| **dashboard-service** | 5006 | `/api/dashboard/*`, `/api/analytics/*` (HTTP aggregation; no Mongo) |

**Compose / ops**: see root **`docker-compose.yml`**, **`Dockerfile`**, **`README.md`**, scripts **`npm run dev:docker`**, **`npm run smoke`**.

---

## 12. Quick reference

| Item | Value |
|------|--------|
| API base (dev) | `http://localhost:5000/api` |
| SPA (dev) | `http://localhost:3000` |
| Env file | **Repository root** `.env` (copy from `.env.example`) |
| Install | `npm install` (workspaces) |
| Run all (dev) | `npm run dev` |
| Docker stack | `npm run dev:docker` or `docker compose up --build -d` |
| Smoke | `npm run smoke` (expects gateway up) |
| Health | `GET http://localhost:5000/health` (gateway) |

**Always set**: `JWT_SECRET`, `INTERNAL_SERVICE_TOKEN`, and `MONGODB_URI` for services that use Mongo. Optional URL overrides: `AUTH_SERVICE_URL`, `JOBS_SERVICE_URL`, `APPLICATIONS_SERVICE_URL`, `RESUME_ANALYSIS_SERVICE_URL`, `SEARCH_SERVICE_URL`, `DASHBOARD_SERVICE_URL` (defaults match local ports in `.env.example`).

---

For integration with **another system**, treat the **gateway** as the only public HTTP surface, reuse JWT rules above, and for machine-to-machine server calls prefer **`INTERNAL_SERVICE_TOKEN`** on documented internal routes rather than sharing user JWTs.
