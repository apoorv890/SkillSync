# ADR 0001: Split SkillSync Monolith into Microservices

**Status:** Accepted
**Date:** 2026-05-04
**Branch:** `refactor`

## Context

SkillSync is currently a two-deployable monolith: a React/Vite client and a single Express/Mongoose backend (see [SKILLSYNC_OVERVIEW.md](../../SKILLSYNC_OVERVIEW.md)). The backend bundles authentication, jobs, applications, candidates, resume parsing, ATS scoring (Groq), search, dashboards, and analytics into one process. We need to integrate SkillSync with another application using a microservice architecture, so the backend must be decomposed along bounded contexts. No new product features are in scope for this refactor.

## Decision

Convert the backend into 7 services + 1 API gateway, deployed independently:

| Service | Port | Owns |
|---|---|---|
| `api-gateway` | 5000 | JWT verification, blacklist check, CSRF, rate limiting, CORS, proxying. Single ingress for the SPA. |
| `auth-service` | 5001 | `users`, `tokenblacklists`, `/auth/*`, `/users/*`, profile photos, OTP. |
| `jobs-service` | 5002 | `jobs`, `/jobs/*`. |
| `applications-service` | 5003 | `applications`, `candidates`, `/applications/*`, `/candidates/*`. |
| `resume-analysis-service` | 5004 | PDF/DOCX parsing + Groq ATS scoring (no DB ownership; stateless worker). |
| `search-service` | 5005 | `/search/*` (read-only across `jobs` + `candidates`). |
| `dashboard-service` | 5006 | `/dashboard/*` and `/analytics/*` (read-only). |

### Architectural decisions

1. **Monorepo with npm workspaces.** Single repo, package names of the form `@skillsync/<name>`. A follow-up consolidation may move `shared/`, `gateway/`, and `services/` under one deployable tree; the legacy `SkillSync-server` package has been removed in favor of the gateway + services only.
2. **Synchronous HTTP for inter-service communication.** No message broker. The current in-process `setImmediate` ATS pipeline becomes a fire-and-forget HTTP POST from `applications-service` to `resume-analysis-service`, which calls back via a `PATCH` to `applications-service`. Same observable behavior; no new external infrastructure.
3. **Logical bounded contexts on a single MongoDB.** Each service connects independently and only writes to the collections it owns. DB-per-service is left as a follow-up; this keeps the refactor purely structural.
4. **Defense-in-depth auth with shared JWT secret.** Every service verifies JWT signatures locally with `JWT_SECRET`. Only the gateway consults the `tokenblacklists` collection (via `auth-service`) so internal calls don't hop. Service-to-service traffic uses an `INTERNAL_SERVICE_TOKEN` HMAC header instead of user JWTs.
5. **CSRF token issuance on the gateway; validation on services.** `GET /api/csrf-token` runs on the gateway (same `JWT_SECRET` cookie signing as downstream). Rate limiting is applied at the gateway on `/api`. Internal service calls are not CSRF-protected.
6. **`@skillsync/shared` package** holds cross-cutting code: `ApiError`, `ApiResponse`, `catchAsync`, Winston logger factory, Mongoose connect helper, JWT verify, `requireAuth` middleware, `requireInternal` middleware, `sanitizeObjectId`, `timingSafeOtpCompare`, HTTP/status constants, S3 helper. Mongoose models are **not** shared - each service owns its schema; read-only services (search, dashboard) declare minimal duplicated schemas.
7. **Resume text never persisted** (existing invariant). It only flows through `resume-analysis-service` memory and is GC'd.
8. **Strangler-fig migration.** Stand up the gateway first, proxying to the legacy monolith, then extract services one at a time until the legacy `server/` package is removed (Phase 10). The gateway remains the single ingress for the SPA.

## Consequences

**Positive**
- Each service is independently deployable, scalable, and ownable.
- The React client is unaffected; the gateway exposes a byte-identical `/api/*` surface on port 5000.
- Resume analysis (the heaviest workload) can be scaled independently.
- The plan is reversible at every phase boundary.

**Negative / accepted trade-offs**
- More processes to run locally (mitigated by `npm run dev` via `concurrently` and a `docker-compose.yml`).
- Cross-service Mongoose `populate()` calls disappear; replaced by HTTP fetches against `/internal/*` endpoints, with steady-state lookups satisfied from JWT claims and denormalized `candidateInfo`.
- Read-only services duplicate `Job`/`Candidate`/`Application` schemas. Single source of truth lives with the owning service; read-only declarations are loose-typed (`new Schema({}, { strict: false })`) to minimize drift risk.
- Token blacklist lookup is gateway-only. Internal traffic trusts the JWT signature alone.

## Alternatives considered

- **Big-bang rewrite.** Rejected: too risky for a "no new features" refactor.
- **Message broker (RabbitMQ / Kafka) for the ATS pipeline.** Rejected for now: adds new infrastructure beyond the scope of "convert to microservices, change nothing else." Re-evaluate when scoring volume justifies it.
- **DB-per-service.** Rejected for now: doubles the surface area of this refactor. The logical bounded contexts established here make a future split mechanical.
- **Polyrepo.** Rejected: a single team is maintaining all services; monorepo keeps refactors atomic.
- **Separate `notifications-service`.** Rejected: email is currently stubbed (OTP is `console.log`'d). Keeps inside `auth-service` until real email is wired up.

## References

- [SKILLSYNC_OVERVIEW.md](../../SKILLSYNC_OVERVIEW.md) - the original handoff doc that catalogues the monolith's surface.
- Refactor plan: `c:/Users/thexu/.cursor/plans/skillsync_microservices_refactor_3dea5a82.plan.md` (lives outside the repo).
