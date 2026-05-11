# SkillSync

AI-assisted recruitment: candidates apply with resumes and ATS scoring; admins manage jobs, applicants, and dashboards.

## Repository layout

| Path | Role |
|------|------|
| `client/` | React 18 + Vite SPA (dev **3000**); proxies `/api` to the server in development |
| `server/` | Express API monolith (**5000**): `/api/*`, Google auth, jobs, applications, calendar, phone-agent routes |
| `phone-agent/` | Twilio Media Streams + Gemini Live (**3010**); webhooks and WebSocket at `/twilio/*` |

Optional: `docker-compose.yml` runs MongoDB plus `server` and `phone-agent` in containers for those who want a self-contained stack.

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
- **Phone / Twilio**: Set **`PUBLIC_BASE_URL`** and **`PHONE_AGENT_BASE_URL`** to the same public **HTTPS** base URL (for example your **ngrok** URL, no trailing slash). The SkillSync server calls the agent using **`PHONE_AGENT_BASE_URL`**. The agent calls the API using **`SKILLSYNC_API_BASE_URL`** (typically `http://127.0.0.1:5000` on your machine) and **`SKILLSYNC_SERVICE_TOKEN`** (must match on server and agent; sent as `Authorization: Bearer …` to `/api/phone-agent/*`).

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

## Docker (optional)

```bash
npm run dev:docker
```

or detached:

```bash
docker compose up --build -d
npm run smoke
npm run docker:down
```

Compose includes a **local MongoDB** service. If you use **Atlas** instead, point **`MONGODB_URI`** at Atlas and you can still run the stack; you may stop or ignore the unused `mongo` service depending on your workflow.

## API and auth (short)

- **Browser → API**: In dev, same-origin via Vite on **3000** with `/api` proxied to the Express app on **5000**. In production, serve the SPA and API behind one origin or set **`VITE_API_BASE_URL`** to your public API base (including `/api` path suffix if your deployment uses it).
- **User JWT**: `Authorization: Bearer …` on protected routes; verified with **`JWT_SECRET`**.
- **Phone-agent → server**: `Authorization: Bearer <SKILLSYNC_SERVICE_TOKEN>` for `/api/phone-agent/*` (see `server/src/middleware/requirePhoneAgent.js`).

## License / product

Private application — see your team’s license and deployment policy.
