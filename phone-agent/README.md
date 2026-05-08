# phone-agent

Twilio outbound calls + Media Streams WebSocket + Gemini Live audio (Node.js, Express, JavaScript).

## Prerequisites

- Node.js 18+
- Twilio account + phone number
- Gemini API key (`GEMINI_API_KEY`)
- Public HTTPS URL for webhooks (e.g. [ngrok](https://ngrok.com)) pointing at this server

## Setup

1. Copy `.env.example` to `.env` and fill in values.

2. Install dependencies:

```bash
npm install
```

3. Start the server:

```bash
npm run start:dev
```

Required environment variables: `GEMINI_API_KEY`, `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`, `PUBLIC_BASE_URL`.

## Endpoints

| Method | Path | Purpose |
|--------|------|---------|
| GET | `/` | Health JSON |
| POST | `/twilio/call` | Place outbound call. Body: `{ "to": "+E.164" }` or set `OUTBOUND_TO` in `.env` |
| POST | `/twilio/voice` | Twilio webhook: returns TwiML with `<Connect><Stream>` |
| WS | `/twilio/stream` | Twilio Media Stream (mulaw 8 kHz ↔ Gemini PCM) |

## Flow

1. `POST /twilio/call` creates a call whose `url` is `{PUBLIC_BASE_URL}/twilio/voice`.
2. When answered, Twilio fetches `/twilio/voice` and opens a WebSocket to `wss://{host}/twilio/stream`.
3. Audio is decoded, upsampled to 16 kHz PCM for Gemini input; Gemini audio is resampled to mulaw 8 kHz for Twilio output.

## Scripts

- `npm start` — production (`node src/server.js`)
- `npm run start:dev` — watch mode with nodemon
