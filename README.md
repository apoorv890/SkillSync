# SkillSync

AI-assisted recruitment: candidates apply with resumes and ATS scoring; admins manage jobs, applicants, and dashboards.

## Repo layout

| Path | Role |
|------|------|
| `client/` | React 18 + Vite SPA (dev **3000**) |
| `gateway/` | API gateway: CORS, rate limit, CSRF cookie + `GET /api/csrf-token`, proxies to services (dev **5000**) |
| `shared/` | `@skillsync/shared` — logger, DB helper, JWT helpers, sanitizers, `requireInternal`, HTTP helpers |
| `services/auth` | Users, JWT, blacklist, `/api/auth/*`, `/api/users/*` (**5001**) |
| `services/jobs` | Jobs CRUD + internal reads (**5002**) |
| `services/applications` | Applications, candidates, S3 resumes, ATS triggers (**5003**) |
| `services/resume-analysis` | PDF/DOCX + Groq; callbacks to applications internal (**5004**) |
| `services/search` | Read-only search over Mongo `jobs` + `candidates` (**5005**) |
| `services/dashboard` | Dashboard + analytics aggregation via internal HTTP (**5006**) |
| `docs/adr/` | Architecture decisions (e.g. `0001-microservices-split.md`) |

Deep dive: **[SKILLSYNC_OVERVIEW.md](./SKILLSYNC_OVERVIEW.md)**.

## Prerequisites

- Node.js **22+** (matches Docker image)
- MongoDB (local or Docker)
- Optional: Docker + Docker Compose

## Configuration

1. Copy **`.env.example`** → **`.env`** at the **repository root** (same level as `package.json`).
2. Set at least `JWT_SECRET`, `INTERNAL_SERVICE_TOKEN`, `MONGODB_URI`, and the keys your services need (`GROQ_API_KEY`, AWS, etc.). See `.env.example` for the full list.

## Local development

```bash
npm install
npm run dev
```

Runs the Vite client, gateway, and all backend workspaces via `concurrently`. The SPA talks to **`http://localhost:5000`** (gateway).

Other useful scripts: `npm run dev:gateway`, `npm run dev:auth`, … `npm run build:client`, `npm run start:gateway` (production gateway only — run other services separately or use Docker).

## Docker

```bash
# Foreground (logs in terminal)
npm run dev:docker

# Or detached
docker compose up --build -d
npm run smoke   # hits gateway /health and /api/csrf-token
npm run docker:down
```

Compose brings up **MongoDB** and all services with internal DNS (`http://auth:5001`, …). Override URLs are set in `docker-compose.yml`; secrets still come from root **`.env`**.

## Contracts (short)

- **Browser → gateway only** on port 5000; gateway forwards to services.
- **User JWT**: `Authorization: Bearer …` on protected routes; services verify with shared `JWT_SECRET`.
- **CSRF**: `GET /api/csrf-token` on the gateway (sets cookie); send `X-CSRF-Token` + `credentials: 'include'` on mutating requests to services that enforce `csurf`.
- **Service → service**: `X-Internal-Token: <INTERNAL_SERVICE_TOKEN>` (see `@skillsync/shared` `requireInternal`).

## License / product

Private application — see your team’s license and deployment policy.
