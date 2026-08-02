import {
  mulawToPcm16k,
  parseRateFromMime,
  PcmToMulaw8kStream,
  TWILIO_MULAW_FRAME_BYTES,
} from './audio.pipeline.js';
import { createLiveSession } from './gemini.liveSession.js';
import { createLogger } from './logger.js';
import { voicehireFetch } from './voicehireClient.js';

const log = createLogger('TwilioMedia');

/**
 * Gemini Live connections have a documented ~10 minute ceiling. Rather than
 * implementing session resumption, calls are deliberately kept short: nudge
 * the agent to wrap up partway through, then hard-close comfortably before
 * the ceiling so a call never gets cut off mid-sentence by Google's side.
 */
const WRAP_UP_AFTER_MS = 5 * 60 * 1000;
const HARD_CLOSE_AFTER_MS = 7 * 60 * 1000;
const WRAP_UP_NUDGE_TEXT =
  'System note (not from the candidate): call time is limited and about 2 minutes remain. ' +
  'Begin wrapping up now — finish booking the interview if that has not happened yet, ' +
  'briefly summarize next steps, thank the candidate, and say goodbye within the next turn or two.';

/** Builds a rough speaker-labeled transcript from Gemini's input/output transcription chunks. */
function buildTranscript(chunks) {
  if (!chunks.length) return '';
  const lines = [];
  let role = null;
  let buffer = '';
  const flush = () => {
    if (role && buffer.trim()) {
      lines.push(`${role === 'candidate' ? 'Candidate' : 'Agent'}: ${buffer.trim()}`);
    }
  };
  for (const chunk of chunks) {
    if (chunk.role !== role) {
      flush();
      role = chunk.role;
      buffer = '';
    }
    buffer += chunk.text;
  }
  flush();
  return lines.join('\n');
}

/**
 * @param {import('ws').WebSocket} ws
 * @param {import('http').IncomingMessage} req
 */
export async function handleMediaStream(ws, req) {
  log.log('Twilio media stream connected');

  let applicationIdFromUrl = null;
  try {
    const u = new URL(req.url || '', 'http://localhost');
    const v = u.searchParams.get('applicationId');
    applicationIdFromUrl = v && v.trim() ? v.trim() : null;
  } catch {
    applicationIdFromUrl = null;
  }

  let streamSid = null;
  let callSid = null;
  /** @type {Awaited<ReturnType<typeof createLiveSession>> | null} */
  let geminiSession = null;
  let geminiReady = false;
  let geminiStarting = false;
  let greetingTriggered = false;
  let closed = false;
  let firstInboundLogged = false;
  let firstOutboundLogged = false;
  let firstGeminiAudioLogged = false;
  /** @type {PcmToMulaw8kStream | null} */
  let downsampler = null;

  const pendingMedia = [];
  /** @type {ReturnType<typeof setTimeout>[]} */
  const callTimers = [];
  /** @type {{ role: 'candidate' | 'agent', text: string }[]} */
  const transcriptChunks = [];

  const closeAll = (reason) => {
    if (closed) return;
    closed = true;
    log.log(`Closing call session: ${reason}`);
    for (const timer of callTimers) clearTimeout(timer);
    try {
      geminiSession?.close();
    } catch (err) {
      log.error('Error closing Gemini session', err);
    }
    try {
      if (ws.readyState === 1) ws.close();
    } catch (err) {
      log.error('Error closing Twilio WebSocket', err);
    }
    void finalizeCallSession(reason);
  };

  /** Best-effort: mark the VoiceHire CallSession ended with a coarse outcome + rough transcript. */
  const finalizeCallSession = async (reason) => {
    if (!callSid) return;
    try {
      const status = /error|failed/i.test(reason) ? 'failed' : 'completed';
      const transcript = buildTranscript(transcriptChunks);
      await voicehireFetch(`/api/phone-agent/calls/${encodeURIComponent(callSid)}/end`, {
        method: 'POST',
        body: JSON.stringify({
          outcome: reason,
          status,
          ...(transcript ? { transcript } : {}),
        }),
      });
    } catch (err) {
      const msg = err instanceof Error ? err.message : String(err);
      log.warn(`Could not finalize CallSession for callSid=${callSid}: ${msg}`);
    }
  };

  const sendAudioFrameToTwilio = (mulawBase64) => {
    if (!streamSid || ws.readyState !== 1) return;
    ws.send(
      JSON.stringify({
        event: 'media',
        streamSid,
        media: { payload: mulawBase64 },
      }),
    );
    if (!firstOutboundLogged) {
      firstOutboundLogged = true;
      log.log('First audio frame sent back to Twilio');
    }
  };

  const sendMulawToTwilio = (mulaw) => {
    for (
      let offset = 0;
      offset < mulaw.length;
      offset += TWILIO_MULAW_FRAME_BYTES
    ) {
      const end = Math.min(offset + TWILIO_MULAW_FRAME_BYTES, mulaw.length);
      sendAudioFrameToTwilio(mulaw.subarray(offset, end).toString('base64'));
    }
  };

  const sendClearToTwilio = () => {
    if (!streamSid || ws.readyState !== 1) return;
    ws.send(JSON.stringify({ event: 'clear', streamSid }));
  };

  const handleGeminiMessage = (message) => {
    const serverContent = message?.serverContent;

    if (serverContent?.interrupted) {
      sendClearToTwilio();
    }

    const candidateText = serverContent?.inputTranscription?.text;
    if (typeof candidateText === 'string' && candidateText) {
      transcriptChunks.push({ role: 'candidate', text: candidateText });
    }
    const agentText = serverContent?.outputTranscription?.text;
    if (typeof agentText === 'string' && agentText) {
      transcriptChunks.push({ role: 'agent', text: agentText });
    }

    const parts = serverContent?.modelTurn?.parts ?? [];
    for (const part of parts) {
      const inline = part?.inlineData;
      if (
        !inline?.data ||
        typeof inline.mimeType !== 'string' ||
        !inline.mimeType.startsWith('audio/pcm')
      ) {
        continue;
      }

      const rate = parseRateFromMime(inline.mimeType, 24000);
      if (!downsampler || downsampler.inputRate !== rate) {
        if (downsampler && downsampler.inputRate !== rate) {
          log.warn(
            `Gemini sample rate changed ${downsampler.inputRate} -> ${rate}; rebuilding resampler`,
          );
        }
        downsampler = new PcmToMulaw8kStream(rate);
      }

      if (!firstGeminiAudioLogged) {
        firstGeminiAudioLogged = true;
        log.log(`First Gemini audio chunk received (mime=${inline.mimeType})`);
      }

      const pcm = Buffer.from(inline.data, 'base64');
      const mulaw = downsampler.process(pcm);
      if (mulaw.length > 0) sendMulawToTwilio(mulaw);
    }
  };

  const sendInboundAudioToGemini = async (b64Mulaw) => {
    if (!geminiSession) return;
    const mulawBuffer = Buffer.from(b64Mulaw, 'base64');
    const pcm16k = mulawToPcm16k(mulawBuffer);
    await geminiSession.sendRealtimeInput({
      audio: {
        data: pcm16k.toString('base64'),
        mimeType: 'audio/pcm;rate=16000',
      },
    });
  };

  const tryTriggerGreeting = () => {
    if (greetingTriggered || !geminiReady || !geminiSession || !streamSid) {
      return;
    }
    greetingTriggered = true;
    try {
      geminiSession.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [
              {
                text: 'The candidate has just answered the phone. Greet them warmly, ask for their name, and begin the interview.',
              },
            ],
          },
        ],
        turnComplete: true,
      });
      log.log('Greeting trigger sent to Gemini');
    } catch (err) {
      log.error('Failed to send initial greeting', err);
    }
  };

  const drainPendingMedia = async () => {
    log.log(
      `Gemini ready, draining ${pendingMedia.length} buffered media frame(s)`,
    );
    while (pendingMedia.length > 0 && !closed) {
      const payload = pendingMedia.shift();
      try {
        await sendInboundAudioToGemini(payload);
      } catch (err) {
        log.error('Error draining buffered media', err);
      }
    }
    tryTriggerGreeting();
  };

  /**
   * Start Gemini only after Twilio `start` so we have `callSid` to resolve applicationId from VoiceHire CallSession.
   */
  const ensureGeminiStarted = async () => {
    if (geminiSession || geminiStarting || closed) return;
    geminiStarting = true;
    try {
      let appId = applicationIdFromUrl;
      if (!appId && callSid) {
        try {
          const ctx = await voicehireFetch(
            `/api/phone-agent/calls/${encodeURIComponent(callSid)}/application-context`,
            { method: 'GET' },
          );
          appId = typeof ctx?.applicationId === 'string' ? ctx.applicationId : null;
          if (appId) {
            log.log(
              `Resolved applicationId from VoiceHire CallSession (callSid=${callSid})`,
            );
          }
        } catch (err) {
          const msg = err instanceof Error ? err.message : String(err);
          log.warn(
            `Could not resolve applicationId from callSid (${callSid}): ${msg}`,
          );
        }
      } else if (appId) {
        log.log('Using applicationId from stream URL query');
      }

      geminiSession = await createLiveSession({
        applicationId: appId || null,
        onmessage: handleGeminiMessage,
        onerror: (e) => {
          log.error(`Gemini session error: ${e?.message ?? e}`);
          closeAll('gemini error');
        },
        onclose: () => closeAll('gemini closed'),
      });

      geminiReady = true;
      geminiStarting = false;

      if (callSid) {
        voicehireFetch(`/api/phone-agent/calls/${encodeURIComponent(callSid)}/start`, {
          method: 'POST',
          body: JSON.stringify({ applicationId: appId || undefined }),
        }).catch((err) => {
          const msg = err instanceof Error ? err.message : String(err);
          log.warn(`Could not mark CallSession in-progress for callSid=${callSid}: ${msg}`);
        });
      }

      callTimers.push(
        setTimeout(() => {
          if (closed || !geminiSession) return;
          try {
            geminiSession.sendClientContent({
              turns: [{ role: 'user', parts: [{ text: WRAP_UP_NUDGE_TEXT }] }],
              turnComplete: true,
            });
            log.log('Sent wrap-up nudge to Gemini');
          } catch (err) {
            log.error('Failed to send wrap-up nudge', err);
          }
        }, WRAP_UP_AFTER_MS),
      );
      callTimers.push(
        setTimeout(() => {
          log.log('Call duration limit reached; closing call');
          closeAll('call duration limit reached');
        }, HARD_CLOSE_AFTER_MS),
      );

      await drainPendingMedia();
    } catch (err) {
      geminiStarting = false;
      log.error('Failed to start Gemini session', err);
      closeAll('gemini start failed');
    }
  };

  ws.on('message', async (data) => {
    let message;
    try {
      const raw = typeof data === 'string' ? data : data.toString('utf8');
      message = JSON.parse(raw);
    } catch (err) {
      log.error('Failed to parse Twilio WS message', err);
      return;
    }

    try {
      switch (message.event) {
        case 'connected':
          log.log('Twilio stream: connected');
          break;

        case 'start': {
          streamSid = message.start?.streamSid ?? message.streamSid ?? null;
          callSid = message.start?.callSid ?? null;
          log.log(
            `Twilio stream started, streamSid=${streamSid} callSid=${callSid}`,
          );
          void ensureGeminiStarted();
          break;
        }

        case 'media': {
          if (!firstInboundLogged) {
            firstInboundLogged = true;
            log.log('First inbound media frame received from Twilio');
          }
          if (!geminiReady) {
            pendingMedia.push(message.media.payload);
            return;
          }
          await sendInboundAudioToGemini(message.media.payload);
          break;
        }

        case 'stop':
          log.log('Twilio stream stopped');
          closeAll('twilio stop');
          break;
      }
    } catch (err) {
      log.error('Error handling Twilio WS message', err);
    }
  });

  ws.on('close', () => {
    log.log('Twilio WebSocket closed');
    closeAll('twilio ws close');
  });

  ws.on('error', (err) => {
    log.error(`Twilio WebSocket error: ${err.message}`);
    closeAll('twilio ws error');
  });
}
