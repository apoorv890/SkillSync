import http from 'http';
import express from 'express';
import cors from 'cors';
import { WebSocketServer } from 'ws';
import { loadConfig } from './config.js';
import { createTwilioRouter } from './twilio.routes.js';
import { handleMediaStream } from './twilio.mediaStream.js';
import { createLogger } from './logger.js';

const log = createLogger('Server');

let config;
try {
  config = loadConfig();
} catch (e) {
  console.error(e.message);
  process.exit(1);
}

const app = express();
app.use(cors());
app.use(express.urlencoded({ extended: true }));

app.get('/', (_req, res) => {
  res.json({ ok: true, service: 'phone-agent' });
});

app.use('/twilio', createTwilioRouter(config));

const server = http.createServer(app);

const wss = new WebSocketServer({ noServer: true });

server.on('upgrade', (req, socket, head) => {
  const url = req.url ?? '';
  if (url === '/twilio/stream' || url.startsWith('/twilio/stream?')) {
    wss.handleUpgrade(req, socket, head, (ws) => {
      wss.emit('connection', ws, req);
    });
  } else {
    socket.destroy();
  }
});

wss.on('connection', (ws) => {
  handleMediaStream(ws).catch((err) => {
    log.error('handleMediaStream failed', err);
    try {
      ws.close();
    } catch {
      /* ignore */
    }
  });
});

server.listen(config.port, () => {
  log.log(`Listening on http://localhost:${config.port}`);
  log.log(`PUBLIC_BASE_URL=${config.publicBaseUrl}`);
});
