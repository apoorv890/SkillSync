# API route inventory

Mounted under the Express app in `server/src/app.js`. Prefix below is relative to the mount path (for example jobs routes are mounted at `/api/jobs`).

Convention: **Client** means a string match under `client/src` (including `apiClient` paths like `/jobs` which resolve to `/api/jobs` in dev via the client base URL). **Phone-agent** means `phone-agent/src`.

| Method | Path | Auth | Used by client | Used by phone-agent |
|--------|------|------|----------------|---------------------|
| GET | `/health` | none | indirect (smoke) | no |
| POST | `/api/auth/google` | none | yes (`googleAuthApi.ts`) | no |
| POST | `/api/auth/onboarding` | none | yes | no |
| POST | `/api/auth/logout` | user JWT | yes | no |
| GET | `/api/auth/me` | user JWT | no string hit (available) | no |
| GET | `/api/users/profile` | user JWT | yes | no |
| PUT | `/api/users/profile` | user JWT | yes | no |
| GET | `/api/jobs` | mixed | yes (`apiClient` `/jobs`) | no |
| GET | `/api/jobs/search` | none | no | no |
| GET | `/api/jobs/:id` | none | yes | no |
| POST | `/api/jobs` | admin | yes | no |
| PUT | `/api/jobs/:id` | admin | yes | no |
| DELETE | `/api/jobs/:id` | admin | no string hit | no |
| POST | `/api/applications/job/:jobId/apply` | user | yes | no |
| DELETE | `/api/applications/job/:jobId/withdraw` | user | yes | no |
| GET | `/api/applications/job/:jobId/status` | user | yes | no |
| GET | `/api/applications/my-applications` | user | no string hit | no |
| GET | `/api/applications/job/:jobId/all` | admin | no string hit | no |
| GET | `/api/applications/resume/:applicationId` | admin | yes | no |
| POST | `/api/applications/:applicationId/retry-analysis` | admin | no string hit | no |
| GET | `/api/applications/:applicationId/ats-status` | admin | no string hit | no |
| PATCH | `/api/applications/:applicationId/status` | admin | yes | no |
| GET | `/api/candidates/job/:id` | none | no string hit | no |
| POST | `/api/candidates/job/:id/upload` | admin | no string hit | no |
| POST | `/api/candidates/:id/schedule` | admin | no string hit | no |
| GET | `/api/search/jobs` | none | no string hit | no |
| GET | `/api/search/candidates` | none | no string hit | no |
| GET | `/api/search/unified` | none | yes | no |
| GET | `/api/search/suggestions/jobs` | none | no string hit | no |
| GET | `/api/search/suggestions/candidates` | none | no string hit | no |
| GET | `/api/dashboard/user-stats` | user | yes | no |
| GET | `/api/dashboard/stats` | user | yes | no |
| GET | `/api/dashboard/admin` | none | no string hit | no |
| GET | `/api/dashboard/user` | none | no string hit | no |
| GET | `/api/analytics` | user | no string hit | no |
| POST | `/api/phone/call` | admin | yes | no |
| POST | `/api/phone-agent/sessions` | service token | no | no |
| GET | `/api/phone-agent/sessions/:id/context` | service token | no | no |
| GET | `/api/phone-agent/calls/:callSid/application-context` | service token | no | yes |
| GET | `/api/phone-agent/applications/:applicationId/context` | service token | no | yes |
| POST | `/api/phone-agent/sessions/:id/events` | service token | no | no |
| POST | `/api/phone-agent/sessions/:id/finalize` | service token | no | no |
| GET | `/api/phone-agent/time` | service token | no | yes |
| GET | `/api/phone-agent/calendar/availability` | service token | no | yes |
| POST | `/api/phone-agent/calendar/schedule` | service token | no | yes |
| GET | `/api/calendar/auth-url` | admin | no string hit | no |
| GET | `/api/calendar/oauth/callback` | none (OAuth) | browser redirect | no |
| GET | `/api/calendar/availability` | admin | no string hit | no |
| POST | `/api/calendar/schedule` | admin | no string hit | no |

## Notes

- **“No string hit”** only means the repo was not grepped for a direct `fetch('/api/...')` or obvious `apiClient` path; the UI may still call the route through shared hooks or undiscovered patterns. Treat this column as **heuristic**, not proof the route is unused.
- Admin bulk flows (`/api/candidates/...`, `/api/applications/job/:jobId/all`, analytics, search sub-routes) may be used from parts of the admin UI not covered by a simple substring search.
- **Removal policy**: prefer keeping routes unless you confirm no external consumers (mobile, scripts, Postman collections). Phone-agent routes must stay for voice.
