import {
  mulawToPcm16k,
  parseRateFromMime,
  PcmToMulaw8kStream,
  TWILIO_MULAW_FRAME_BYTES,
} from './audio.pipeline.js';
import { createLiveSession } from './gemini.liveSession.js';
import { createLogger } from './logger.js';

const log = createLogger('TwilioMedia');

/**
 * @param {import('ws').WebSocket} ws
 */
export async function handleMediaStream(ws) {
  log.log('Twilio media stream connected');

  let streamSid = null;
  /** @type {Awaited<ReturnType<typeof createLiveSession>> | null} */
  let geminiSession = null;
  let geminiReady = false;
  let greetingTriggered = false;
  let closed = false;
  let firstInboundLogged = false;
  let firstOutboundLogged = false;
  let firstGeminiAudioLogged = false;
  /** @type {PcmToMulaw8kStream | null} */
  let downsampler = null;

  const pendingMedia = [];

  const closeAll = (reason) => {
    if (closed) return;
    closed = true;
    log.log(`Closing call session: ${reason}`);
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

        case 'start':
          streamSid = message.start?.streamSid ?? message.streamSid ?? null;
          log.log(`Twilio stream started, streamSid=${streamSid}`);
          tryTriggerGreeting();
          break;

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

  try {
    geminiSession = await createLiveSession({
      onmessage: handleGeminiMessage,
      onerror: (e) => {
        log.error(`Gemini session error: ${e?.message ?? e}`);
        closeAll('gemini error');
      },
      onclose: () => closeAll('gemini closed'),
    });
  } catch (err) {
    log.error('Failed to start Gemini session', err);
    closeAll('gemini start failed');
    return;
  }

  geminiReady = true;
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
}

