# SkillSync — Application Overview

> A handoff document describing the SkillSync codebase: architecture, tech stack,
> data, APIs, security, external dependencies, and the natural seams where it
> can be split into microservices. Share this with the team that owns the
> application you plan to merge with.

SkillSync is an **AI-powered recruitment platform**. It has two sides:

- **Candidates (role: `user`)** — browse jobs, apply with a resume, track application status, see AI-generated ATS match scores.
- **Recruiters (role: `admin`)** — create/manage jobs, view applicants ranked by ATS score, schedule interviews, and view dashboards/analytics.

The repo ships a **Vite SPA** (`client/`) and a **decomposed backend**: an API **gateway** (`gateway/`) on port 5000 proxies to services under `services/` (auth, jobs, applications, resume-analysis, search, dashboard). The legacy single `server/` app has been **removed** (Phase 10); there is still no message broker; ATS scoring runs in `resume-analysis-service` with callbacks to `applications-service`.

---

## Table of Contents

1. [Tech Stack](#1-tech-stack)
2. [High-Level Architecture (today)](#2-high-level-architecture-today)
3. [Backend Folder Layout](#3-backend-folder-layout)
4. [Data Model (MongoDB collections)](#4-data-model-mongodb-collections)
5. [REST API](#5-rest-api-mounted-under-api-in-serversrcroutesindexjs)
6. [Service Layer](#6-service-layer-the-business-logic-worth-porting)
7. [Security Model](#7-security-model)
8. [External Dependencies](#8-external-dependencies-the-outside-the-box-surface)
9. [Frontend Folder Layout](#9-frontend-folder-layout)
10. [Cross-Cutting Concerns to Preserve When Splitting](#10-cross-cutting-concerns-to-preserve-when-splitting)
11. [Recommended Microservice Decomposition](#11-recommended-microservice-decomposition)
12. [Quick Reference for the Receiving Team](#12-quick-reference-for-the-receiving-team)

---

## 1. Tech Stack

### Backend (`server/`)
- **Runtime**: Node.js 18+, ES Modules (`"type": "module"`)
- **Framework**: Express 4
- **Database**: MongoDB (Mongoose 8)
- **Auth**: JWT (access + refresh tokens), bcryptjs, token blacklist in DB
- **AI**: `groq-sdk` → `llama-3.3-70b-versatile` (also legacy `llama3-70b-8192` in `CandidateController.js`)
- **Storage**: AWS S3 (`@aws-sdk/client-s3`, `@aws-sdk/s3-request-presigner`)
- **File parsing**: `pdf-parse`, `mammoth` (DOCX), `pdf2pic`
- **Security middleware**: `helmet`, `cors`, `csurf` (CSRF), `express-rate-limit`, `express-validator`
- **Logging**: Winston
- **Email**: `nodemailer` (currently OTP is just `console.log`'d)
- **Uploads**: `multer` (10 MB cap, PDF/DOCX)

### Frontend (`client/`)
- **Framework**: React 18 + TypeScript + Vite (port 3000)
- **Routing**: React Router DOM v6
- **UI**: Tailwind CSS + Radix UI + Tabler/Lucide icons + `recharts`
- **Forms/validation**: `react-hook-form` + `zod`
- **State**: Context API (`AuthContext`, `DashboardContext`)
- **HTTP**: Custom fetch wrapper in `client/src/lib/apiClient.ts` — caching, request deduplication, JWT auth, CSRF token

### Process orchestration (root `package.json`)
- `concurrently` runs `client` (3000) and `server` (5000) together via `npm run dev`.

---

## 2. High-Level Architecture (today)

```
[ React SPA :3000 ]  --HTTP/JSON-->  [ Express API :5000 ]  --->  MongoDB
       ^                                       |
       |                                       +--> AWS S3 (resumes, profile photos)
       +-- localStorage(JWT)                   +--> Groq AI  (LLaMA 3.3 70B scoring)
       +-- Cookie(CSRF)                        +--> SMTP     (nodemailer / OTP, mostly stubbed)
```

- The Vite dev server proxies `/api/*` → `http://localhost:5000` (`client/vite.config.ts`).
- Production CORS is locked down with the `ALLOWED_ORIGINS` env var.

---

## 3. Backend Folder Layout

```
server/
├── server.js                 # Entrypoint: loads .env, connects DB, starts Express, graceful shutdown
└── src/
    ├── app.js                # Express app: helmet, cors, body parsers, rate limit, /api routes, 404, errorHandler
    ├── config/
    │   ├── database.js       # mongoose.connect(MONGODB_URI)
    │   ├── aws.js            # S3 client config
    │   ├── logger.js         # Winston logger
    │   ├── envValidation.js  # Fail-fast on missing required env vars
    │   └── constants.js      # HTTP_STATUS, APPLICATION_STATUS, JOB_STATUS, etc.
    ├── routes/               # 1 file per resource, mounted in routes/index.js
    ├── controllers/          # Thin layer: parse req, call service, return ApiResponse
    ├── services/             # All business logic (see §6)
    ├── middleware/           # auth, csrf, validation, rateLimiter, upload, errorHandler, requestLogger
    ├── models/               # Mongoose schemas (see §4)
    ├── utils/                # ApiError, ApiResponse, catchAsync, querySanitizer, timingSafe, loggerHelper, searchUtils
    └── scripts/              # seedJobs, removeDuplicates, checkJobs, testAnalytics
```

The Express app is built in `server/src/app.js`:

```js
// server/src/app.js (lines 22–71)
const app = express();

// CORS configuration - restrict to allowed origins
const corsOptions = {
  origin: function (origin, callback) {
    if (!origin) return callback(null, true);
    const allowedOrigins = process.env.ALLOWED_ORIGINS?.split(',') || ['http://localhost:3000'];
    if (allowedOrigins.indexOf(origin) !== -1) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true,
  optionsSuccessStatus: 200
};

app.use(helmet());
app.use(cors(corsOptions));
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ extended: true, limit: '10mb' }));
app.use('/api', apiLimiter);
app.use(requestLogger);
app.use(attachLogPrefix);
app.use('/api', routes);
```

---

## 4. Data Model (MongoDB collections)

| Collection | Purpose | Key fields |
|---|---|---|
| `users` | Account + auth | `fullName`, `email` (unique), `password` (bcrypt-hashed), `role: 'admin'\|'user'`, `profilePhotoUrl`, `profilePhotoKey`, `resetPasswordOTP`, `resetPasswordOTPExpires` |
| `jobs` | Job postings | `title`, `location`, `workType`, `status: draft\|active\|closed`, `summary`, `keyResponsibilities`, `requiredSkills`, `preferredSkills`, `aboutCompany`, `compensation`, legacy `description`/`requirements`, `keywords[]`, `searchableTitle`. Mongo **text index** on title/location/description/requirements/keywords. |
| `applications` | Candidate-applies-to-job (the main user flow) | `userId→User`, `jobId→Job`, `candidateInfo {name,email}`, `resume {fileUrl,s3Key,fileName,fileType,fileSize,uploadedAt}`, `atsScore {score,analyzedAt,status: pending\|processing\|completed\|failed,error,breakdown,matchSummary}`, `status: applied\|withdrawn\|Under Review\|Shortlisted\|Rejected\|Hired`, `appliedAt`, `withdrawnAt`. Unique index `{userId,jobId}`. |
| `candidates` | Admin-uploaded resumes (separate flow from `applications`) | `jobId`, `name`, `email`, `atsScore`, `matchExplanation`, `resumeText`, `resumeUrl`, `callScheduled`, `skills[]`. Has its own text index. |
| `tokenblacklists` | Revoked JWTs (after logout) | `token`, `userId`, `reason`, TTL'd by JWT expiry. |

> Note: There are **two parallel scoring flows** — `Application` (user-driven) and `Candidate` (admin-uploads-PDFs-in-bulk). When you split into microservices, decide whether to keep both or unify.

---

## 5. REST API (mounted under `/api` in `server/src/routes/index.js`)

```js
// server/src/routes/index.js (lines 22–39)
router.use('/auth', authRoutes);
router.use('/jobs', jobRoutes);
router.use('/applications', applicationRoutes);
router.use('/candidates', candidateRoutes);
router.use('/search', searchRoutes);
router.use('/dashboard', dashboardRoutes);
router.use('/analytics', analyticsRoutes);
router.use('/users', profileRoutes);

router.get('/health', ...)
```

### `/api/auth` (`authRoutes.js`)
| Method | Path | Auth | Purpose |
|---|---|---|---|
| POST | `/register` | – | Create user (always role `user`); returns `{accessToken, refreshToken, user}` |
| POST | `/login` | – | Returns `{accessToken, refreshToken, user}` |
| POST | `/logout` | JWT | Blacklists current token |
| GET  | `/me` | JWT | Current user (no password) |
| POST | `/refresh` | – | Trade refresh token for new access token |
| POST | `/forgot-password` | – | Sends OTP (currently logged) |
| POST | `/verify-otp` | – | Verifies OTP (timing-safe) |
| POST | `/reset-password` | – | Resets password with OTP |

### `/api/jobs` (`jobRoutes.js`)
- `GET /`, `GET /search`, `GET /:id` — public
- `POST /`, `PUT /:id`, `DELETE /:id` — admin + CSRF

### `/api/applications` (`applicationRoutes.js`)
- `POST /job/:jobId/apply` — JWT + CSRF + multer upload `resume`. Triggers async ATS analysis via `setImmediate`.
- `DELETE /job/:jobId/withdraw` — JWT + CSRF
- `GET /job/:jobId/status`, `GET /my-applications` — JWT
- Admin: `GET /job/:jobId/all`, `GET /resume/:applicationId` (returns S3 pre-signed URL, 1h), `POST /:id/retry-analysis`, `GET /:id/ats-status`, `PATCH /:id/status`

### `/api/candidates` (`candidateRoutes.js`)
- `GET /job/:id` — list candidates for a job
- `POST /job/:id/upload` — admin uploads up to 5 PDFs; runs Groq scoring **synchronously** and writes `Candidate` docs
- `POST /:id/schedule` — admin marks interview scheduled

### `/api/search` (`searchRoutes.js`)
`/jobs`, `/candidates`, `/unified`, `/suggestions/jobs`, `/suggestions/candidates`

### `/api/dashboard` (`dashboardRoutes.js`)
- `GET /stats` — JWT, role-aware (admin returns job/candidate counts; user returns application counts + average ATS score + recent apps)
- `GET /admin`, `GET /user` (legacy)

### `/api/analytics` (`analyticsRoutes.js`)
- `GET /` — JWT, jobs-created-per-day for ranges `7d`/`30d`/`90d`

### `/api/users` (`profileRoutes.js`)
- `GET /profile`, `PUT /profile`
- `POST /profile/photo`, `DELETE /profile/photo` — multipart, S3-backed, CSRF

### Health/CSRF
- `GET /api/csrf-token`
- `GET /api/health`

---

## 6. Service Layer (the "business logic" worth porting)

`server/src/services/`:

| Service | What it does |
|---|---|
| **`TokenService`** | Issues access (`type: 'access'`) and refresh (`type: 'refresh'`) JWTs, verifies, extracts from `Authorization`, blacklists. |
| **`S3Service`** | `uploadResume`, `deleteFile`, `getPreSignedUrl`. |
| **`s3ProfileService`** | Same for profile photos. |
| **`JobService`** | CRUD + keyword extraction for `Job`. |
| **`ApplicationService`** | Validates job is `active`, prevents duplicate applications, reactivates withdrawn ones, uploads resume to S3, creates `Application`, fires `ResumeAnalysisService.analyzeResume(...)` via `setImmediate`. |
| **`ResumeParserService`** | Streams the resume from S3 by `s3Key`, runs `pdf-parse` or `mammoth`, returns text. **Text is never persisted** — only held in memory. |
| **`ATSScoreService`** | Calls Groq with a strict prompt that returns `SKILLS/EXPERIENCE/EDUCATION/KEYWORDS/MATCH_SUMMARY`. Computes weighted total: **Skills 35% / Experience 30% / Education 15% / Keywords 20%**. Has retries with exponential backoff. |
| **`ResumeAnalysisService`** | Orchestrator: load `Application` → set `atsScore.status='processing'` → parse → score with `ATSScoreService` → persist `score`, `breakdown`, `matchSummary`, `analyzedAt`, `status='completed'` (or `failed` + `error`). |

### The candidate-side "apply" pipeline (key flow to integrate against)

```js
// server/src/services/ApplicationService.js (lines 88–94)
// Trigger async ATS analysis (non-blocking)
setImmediate(() => {
  ResumeAnalysisService.analyzeResume(application._id.toString(), req)
    .catch((error) => {
      logger.error(`ATS analysis failed: ${error.message}`);
    });
});
```

This is the natural seam where you should plug in a **message queue** (RabbitMQ / Kafka / SQS / NATS) when going to microservices.

---

## 7. Security Model

- **JWT** — `Authorization: Bearer <accessToken>`. Verified by `authenticate` middleware which also rejects blacklisted tokens. `requireAdmin` enforces `role === 'admin'`.
- **CSRF** — `csurf` cookie-based. Frontend fetches `/api/csrf-token` once and sends `X-CSRF-Token` on every state-changing request.
- **Rate limiting** — global `apiLimiter` on `/api`; stricter `authLimiter` on login/register; `passwordResetLimiter`.
- **Validation** — `express-validator` on registration, login, password reset, OTP verification, job create/update.
- **Input sanitization** — `sanitizeObjectId` on every mongo lookup that takes user input (`utils/querySanitizer.js`).
- **Timing-safe comparisons** — `timingSafeOtpCompare` for OTP, dummy hash branches in `forgot-password`/`reset-password` to prevent account enumeration.
- **Password rules** — `>=8 chars, upper, lower, digit, @$!%*?&` (enforced in `User` schema).
- **CORS allowlist** — `ALLOWED_ORIGINS=comma,separated,list`.
- **Helmet** — default security headers.
- **File uploads** — 10 MB cap, MIME-type filtered (PDF, DOCX).

---

## 8. External Dependencies (the "outside-the-box" surface)

| System | Used by | Env vars |
|---|---|---|
| **MongoDB** | All services | `MONGODB_URI` |
| **AWS S3** | `S3Service`, `s3ProfileService` (resume + profile photo storage) | `AWS_ACCESS_KEY_ID`, `AWS_SECRET_ACCESS_KEY`, `AWS_REGION`, `AWS_S3_BUCKET_NAME` |
| **Groq AI** | `ATSScoreService`, `CandidateController.processResumeWithLLM` | `GROQ_API_KEY` (model: `llama-3.3-70b-versatile`) |
| **SMTP/Email** | `nodemailer` (currently logs OTP) | `EMAIL_SERVICE`, `EMAIL_USER`, `EMAIL_PASS` |
| **JWT** | `TokenService` | `JWT_SECRET`, `JWT_EXPIRES_IN` |

> Heads-up: keep the repository root `.env` (gitignored) out of commits; it holds real credentials (Groq, AWS, etc.). Rotate any leaked keys before merging.

---

## 9. Frontend Folder Layout

```
client/src/
├── App.tsx                     # Routes, role-based layout switch
├── main.tsx                    # ReactDOM bootstrap
├── lib/apiClient.ts            # Central fetch wrapper (auth + CSRF + cache + dedup)
├── context/AuthContext.tsx     # JWT in localStorage('token'), user object
├── contexts/DashboardContext.tsx
├── hooks/                      # useAuth, useApi, useApiCache
├── pages/                      # AuthPage, RegisterPage, ForgotPasswordPage, Dashboard, ProfilePage, SearchPage
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

## 10. Cross-Cutting Concerns to Preserve When Splitting

1. **Auth header propagation** — every request carries `Authorization: Bearer <jwt>` and a `csrf-token` cookie + `X-CSRF-Token` header.
2. **Role enforcement** — `admin` vs `user` is asserted on the **server**, not the client. Any new service must validate `role` from the JWT claims (`{userId, email, role, type:'access'}`).
3. **ObjectId sanitization** — keep `sanitizeObjectId` (or equivalent) in front of any DB lookup taking user input.
4. **Resume text never persists** — `ResumeParserService` extracts text in memory only. Whatever your second app does, it should respect this contract.
5. **Idempotency around duplicate applies** — the unique compound index `{userId, jobId}` plus reactivation logic in `ApplicationService.createApplication`.

---

## 11. Recommended Microservice Decomposition

The codebase already has clean service-layer seams. A reasonable split:

| Microservice | Owns | Notes |
|---|---|---|
| **API Gateway** (new) | JWT validation, CSRF, rate limiting, request routing, CORS | Express + `http-proxy-middleware`, or Kong/NGINX. The React SPA only ever talks to this. |
| **Auth Service** | `users`, `tokenblacklists`, `/auth/*`, `/users/profile/*`, profile photos | Owns JWT issuance/refresh/blacklist + OTP flow. Publishes `user.created`, `user.updated`. |
| **Jobs Service** | `jobs`, `/jobs/*`, `/search/jobs`, `/search/suggestions/jobs` | Pure CRUD + text-search. |
| **Applications Service** | `applications`, `/applications/*` | Calls Auth (validate token), Jobs (validate job is active), S3 (upload resume), and **emits an event** when a new application is created. |
| **Resume Analysis Service** (Worker) | Subscribes to `application.created` → parses resume from S3 → calls Groq → writes back ATS score (HTTP callback to Applications, or directly to its own DB read-model) | Replace today's `setImmediate(...)` with a real queue. Heavy lifting (Groq, PDF parsing) belongs here. |
| **Candidates Service** | `candidates`, admin bulk-upload flow | Could also share the Resume Analysis Service. |
| **Search Service** | `/search/unified`, full-text aggregation across jobs + candidates | Optionally back this with Elasticsearch/Meilisearch. |
| **Analytics/Dashboard Service** | `/dashboard/*`, `/analytics/*` | Read-only aggregator — could be a denormalized read-model fed by events. |
| **Notifications Service** | Email (nodemailer/SES), interview-scheduling, OTP delivery | Subscribes to `password.reset.requested`, `interview.scheduled`, `application.statusChanged`. |

### Suggested integration contract for the other application

If the other app needs to talk to SkillSync:

1. **Authenticate** by calling `POST /api/auth/login` (or accept a SkillSync-issued JWT).
2. **Send `Authorization: Bearer <accessToken>`** on every request and verify via `JWT_SECRET` (or expose `/api/auth/verify` if you don't want to share the secret).
3. **For state-changing requests**, fetch `GET /api/csrf-token` once, then send `X-CSRF-Token` + the cookie. (If you put a gateway in front, you can drop CSRF for service-to-service traffic and only enforce it on browser-originated traffic.)
4. **Events to subscribe to** (recommended once you have a broker):
   - `user.registered`, `user.updated`, `user.deleted`
   - `job.created`, `job.updated`, `job.statusChanged`
   - `application.submitted`, `application.statusChanged`, `application.withdrawn`
   - `ats.scored` (with `applicationId`, `score`, `breakdown`, `matchSummary`)

### Migration sequence (low risk → high risk)

1. Wrap the current monolith behind an **API Gateway**; the second app integrates via the gateway only.
2. Extract **Auth Service** first (it's the most decoupled — only owns `User` + tokens).
3. Extract **Resume Analysis** as a worker behind a **queue** (replace `setImmediate`).
4. Extract **Jobs**, **Applications**, **Candidates** in that order.
5. Replace cross-service Mongoose `populate()` calls with HTTP calls or denormalized read-models.

---

## 12. Quick Reference for the Receiving Team

- **Base URL (dev)**: `http://localhost:5000/api`
- **Frontend (dev)**: `http://localhost:3000`
- **Auth header**: `Authorization: Bearer <accessToken>`
- **CSRF header**: `X-CSRF-Token: <token from GET /api/csrf-token>` + `credentials: 'include'`
- **Health check**: `GET /api/health`
- **Required env vars** (`.env.example`):

```env
MONGODB_URI=mongodb://localhost:27017/SkillSync
JWT_SECRET=...
JWT_EXPIRES_IN=7d
GROQ_API_KEY=...
EMAIL_SERVICE=gmail
EMAIL_USER=...
EMAIL_PASS=...
COMPANY_NAME=...
AWS_ACCESS_KEY_ID=...
AWS_SECRET_ACCESS_KEY=...
AWS_REGION=us-east-1
AWS_S3_BUCKET_NAME=...
ALLOWED_ORIGINS=http://localhost:3000
```

- **Run from repo root**: `npm run install:all` then `npm run dev`.

---

If you want a tighter integration spec, share back: (a) the **other application's** tech stack and the domain it owns (auth, jobs, scoring, notifications, …), and (b) which direction the calls flow (it calls SkillSync, SkillSync calls it, or both). With that, this document can be extended with concrete endpoint/event contracts.
