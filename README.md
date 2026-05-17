# SkillSync

AI-assisted recruitment: candidates apply with resumes and ATS scoring; admins manage jobs, applicants, and dashboards.

## Repository layout

| Path | Role |
|------|------|
| `client/` | React 18 + Vite SPA (dev **3000**); proxies `/api` to the server in development |
| `server/` | Express API monolith (**5000**): `/api/*`, Google auth, jobs, applications, calendar, phone-agent routes |
| `phone-agent/` | Twilio Media Streams + Gemini Live (**3010**); webhooks and WebSocket at `/twilio/*` |

Docker defaults to an **Atlas-first two-container stack**: `app` (Express API + built SPA) and `phone-agent`. Optional local Mongo is available via `docker-compose.mongo.yml`.

## Prerequisites

- Node.js **22+**
- A **MongoDB Atlas** cluster (recommended) and a connection string for `MONGODB_URI`
- Optional: **ngrok** (or similar) for public HTTPS to the phone-agent when testing Twilio
- Optional: Docker + Docker Compose

## Configuration

1. Copy **`.env.example`** to **`.env`** at the **repository root** (next to the root `package.json`).
2. Replace every placeholder with real values. Keys are documented only in `.env.example` (no duplicate list here); required vs optional behavior follows `server/src/config/envValidation.js` and `phone-agent/src/config.js`.

Important details:

- **`MONGODB_URI`**: Use your **Atlas** SRV URI. In Atlas, allow your IP (or `0.0.0.0/0` for quick local tests only) under **Network Access**.
- **`PORT`**: Leave **empty** in `.env` unless you know you need it. The server defaults to **5000**; the phone-agent defaults to **3010**. Setting a single `PORT` in `.env` applies to **both** processes and can break one of them.
- **`GOOGLE_CLIENT_ID`** and **`VITE_GOOGLE_CLIENT_ID`**: Use the **same** Google OAuth **Web** client ID.
- **Phone / Twilio**: Twilio must reach the phone-agent on a public **HTTPS** URL. For host-based development you can still set **`PUBLIC_BASE_URL`** and **`PHONE_AGENT_BASE_URL`** to the same **ngrok** URL manually. For Docker voice runs, Compose can start an **`ngrok`** sidecar and the phone-agent can auto-discover its public URL from **`NGROK_API_URL`**. The SkillSync server calls the agent using **`PHONE_AGENT_BASE_URL`**. The agent calls the API using **`SKILLSYNC_API_BASE_URL`** and **`SKILLSYNC_SERVICE_TOKEN`** (must match on server and agent; sent as `Authorization: Bearer …` to `/api/phone-agent/*`).

## Local development (recommended)

From the repository root:

```bash
npm install
npm install --prefix client
npm install --prefix server
npm install --prefix phone-agent
npm run dev
```

This runs **client**, **server**, and **phone-agent** together. The Vite dev server serves the SPA on **port 3000** and proxies **`/api`** to **`http://localhost:5000`**, so the browser uses **relative** `/api/...` URLs and you avoid hardcoding the API host.

### Twilio and ngrok (when you need voice)

1. Start services (`npm run dev` or run the phone-agent alone with `npm run start:dev` in `phone-agent/`).
2. Expose the agent: `ngrok http 3010` (or the port the agent actually listens on).
3. Set **`PUBLIC_BASE_URL`** and **`PHONE_AGENT_BASE_URL`** in `.env` to the **https** URL ngrok prints (no trailing slash). Restart server and phone-agent after changing `.env`.

If you prefer not to copy the ngrok URL manually, set **`NGROK_API_URL=http://127.0.0.1:4040`** in `.env`; the phone-agent will read the active HTTPS tunnel from the local ngrok API at call time.

### Running pieces separately

- Server only: `npm run dev:server`
- Client only: `npm run dev:client`
- Phone-agent only: `npm run dev:phone-agent` or `npm --prefix phone-agent run start:dev`

## Smoke checks

After the server is up:

```bash
npm run smoke
```

This hits the server **`/health`** endpoint (override base URL with `SMOKE_SERVER_URL` if needed). See **Smoke checklist** in this file below.

### Smoke checklist

1. Server: open or curl `http://127.0.0.1:5000/health` and confirm JSON `status` is OK.
2. Client: open `http://localhost:3000` (Vite) and sign in with Google as a smoke test of auth.
3. Phone-agent (optional): with the agent running, curl `http://127.0.0.1:3010/` and confirm JSON `service` is `phone-agent`.
4. Twilio (optional): requires ngrok and Twilio env vars; place a test call only when those are configured.

## Docker (Atlas-first, production-like)

```bash
npm run dev:docker
```

or detached:

```bash
docker compose up --build -d
npm run smoke
npm run docker:down
```

This starts **three containers** by default:

- `app`: Express API + built client SPA on **http://localhost:5000**
- `phone-agent`: Twilio/Gemini service on **http://localhost:3010**
- `ngrok`: tunnels **https → phone-agent:3010** so Twilio can reach webhooks; local inspector on **http://localhost:4040**

Notes:

- Default Compose expects **`MONGODB_URI`** in `.env` to point to **Atlas**.
- The `app` container injects **`PHONE_AGENT_BASE_URL=http://phone-agent:3010`**.
- The `phone-agent` container injects **`SKILLSYNC_API_BASE_URL=http://app:5000`** and **`NGROK_API_URL=http://ngrok:4040`** so the agent reads the public tunnel URL from the ngrok sidecar. Override in `.env` only if you know you need something different.
- **Twilio / ngrok:** set **`NGROK_AUTHTOKEN`** in `.env` from [Your Authtoken](https://dashboard.ngrok.com/get-started/your-authtoken) (free account is enough). Without it the ngrok container logs **`ERR_NGROK_4018`**. You may omit **`PUBLIC_BASE_URL`** in `.env` for this stack; the agent resolves HTTPS from ngrok at call time.
- To run **without** the ngrok container (for example no Twilio yet): `docker compose up app phone-agent` (or scale/stop `ngrok` after up).
- When you use the SPA served from `app`, it talks to `/api` on the **same origin** (`localhost:5000`) in the built image.
- If you still run the Vite dev server separately while Docker is up, set **`ALLOWED_ORIGINS`** to include both `http://localhost:3000` and `http://localhost:5000`.

### Optional local Mongo container

If you want Compose to run Mongo locally too:

```bash
docker compose -f docker-compose.yml -f docker-compose.mongo.yml up --build
```

That adds a third `mongo` container and overrides `MONGODB_URI` inside `app` to `mongodb://mongo:27017/SkillSync`.

## API and auth (short)

- **Browser → API**: In dev, same-origin via Vite on **3000** with `/api` proxied to the Express app on **5000**. In production, serve the SPA and API behind one origin or set **`VITE_API_BASE_URL`** to your public API base (including `/api` path suffix if your deployment uses it).
- **User JWT**: `Authorization: Bearer …` on protected routes; verified with **`JWT_SECRET`**.
- **Phone-agent → server**: `Authorization: Bearer <SKILLSYNC_SERVICE_TOKEN>` for `/api/phone-agent/*` (see `server/src/middleware/requirePhoneAgent.js`).

## License / product

Private application — see your team’s license and deployment policy.
