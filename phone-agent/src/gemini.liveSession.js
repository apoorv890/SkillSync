import { GoogleGenAI, Modality } from '@google/genai';
import { createLogger } from './logger.js';

const log = createLogger('Gemini');

const SYSTEM_PROMPT = `You are an AI phone interviewer for a tech company.
When the call connects, greet the candidate warmly, ask for their name,
and then ask about their experience and skills in a professional manner.
Keep responses concise and conversational since this is a phone conversation.
Speak naturally, one short turn at a time, and wait for the candidate to
finish speaking before responding.`;

/**
 * @param {object} callbacks
 * @param {() => void} [callbacks.onopen]
 * @param {(message: object) => void} callbacks.onmessage
 * @param {(e: object) => void} [callbacks.onerror]
 * @param {(e: object) => void} [callbacks.onclose]
 */
export async function createLiveSession(callbacks) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  return ai.live.connect({
    model: 'gemini-3.1-flash-live-preview',
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
    },
    callbacks: {
      onopen: () => {
        log.log('Gemini Live session opened');
        callbacks.onopen?.();
      },
      onmessage: (message) => {
        try {
          callbacks.onmessage(message);
        } catch (err) {
          log.error('Error in Gemini onmessage handler', err);
        }
      },
      onerror: (e) => {
        log.error(`Gemini error: ${e?.message ?? e}`);
        callbacks.onerror?.(e);
      },
      onclose: (e) => {
        log.log(`Gemini session closed: ${e?.reason ?? ''}`);
        callbacks.onclose?.(e);
      },
    },
  });
}

