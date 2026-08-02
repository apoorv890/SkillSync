import { randomUUID } from 'crypto';
import { GoogleGenAI, Modality, FunctionCallingConfigMode } from '@google/genai';
import { createLogger } from './logger.js';
import { getSkillsyncConfig, skillsyncFetch } from './skillsyncClient.js';

const log = createLogger('Gemini');

const SYSTEM_PROMPT = `You are an AI phone interviewer for a tech company.
When the call connects, greet the candidate warmly by their first name (use the name
provided in the private candidate context — do NOT ask them to identify themselves
or confirm their name). Speak the greeting a little slower and clearly, with a brief
natural pause after the greeting, so the candidate has time to settle in before you
continue. Then transition into asking about their experience and skills in a
professional manner, tailoring your first question to their background if it's
available in the private context.
Keep responses concise and conversational since this is a phone conversation.
Speak naturally, one short turn at a time, and wait for the candidate to
finish speaking before responding.

You may be given private context about the job role and candidate. Do NOT proactively mention or reveal private context.
Only reference job/candidate details if the candidate explicitly asks a related question, and then answer only what was asked.

CALL LENGTH (important): This call is short by design — plan to be done in about 6-7 minutes total.
Pace the conversation accordingly; do not dwell too long on any one question. If you receive a system
note that time is almost up, stop what you're doing within your next turn: finish booking the interview
if that hasn't happened yet, briefly thank the candidate, and say a warm goodbye. Do not wait for the
candidate to end the call themselves once you've said goodbye.

TIMEZONE (critical): All scheduling is in Asia/Kolkata — Indian Standard Time (IST, UTC+05:30).
Never say "UTC", "GMT", or "Zulu". Never convert IST slots to another timezone when speaking.
Whenever you need "today", "now", or the current date/time, call getCurrentTimeIst first and use voiceLabel from that response.

When listing interview times, use each slot's voiceLabel from getInterviewSlots verbatim when possible.

As the call wraps up, call getInterviewSlots (week auto or next if they want next week). Offer a few voiceLabel options.
When they pick one, call bookInterviewSlot with the exact startIso from that slot (applicationId is only needed if call metadata did not include one).
Confirm using voiceConfirmation from the booking result or repeat the IST time clearly.
If a tool returns an error string, read it once to the candidate in simple words and try once more — do not invent times.`;

/** Gemini Live may send tool calls on `toolCall`, under `serverContent`, or as `Part.functionCall` on `modelTurn`. */
function extractFunctionCalls(message) {
  const fromDirect =
    message?.toolCall?.functionCalls ||
    message?.serverContent?.toolCall?.functionCalls;
  const fromParts =
    message?.serverContent?.modelTurn?.parts
      ?.map((p) => p?.functionCall)
      .filter(Boolean) || [];
  const fromLegacy = message?.toolCalls?.flatMap?.((t) => t?.functionCalls || []) || [];
  const merged = [...(fromDirect || []), ...fromLegacy, ...fromParts];
  return merged;
}

const toolDeclarations = [
  {
    name: 'getCurrentTimeIst',
    description:
      'Returns the current date and time in Asia/Kolkata (IST). Call this whenever you need "today", "now", or correct calendar date — do not guess.',
    parameters: {
      type: 'object',
      properties: {},
      required: [],
    },
  },
  {
    name: 'getApplicationContext',
    description:
      'Fetch job/candidate context for this call. Use this only to answer questions or to help guide the interview; do not proactively reveal details. If call metadata already included applicationId, you may omit it here.',
    parameters: {
      type: 'object',
      properties: {
        applicationId: {
          type: 'string',
          description: 'SkillSync application id (optional if already provided for this call)',
        },
      },
      required: [],
    },
  },
  {
    name: 'getInterviewSlots',
    description:
      'Get available 60-minute interview slots in IST (Mon–Fri, 10:00–18:00) on the calendar of the recruiter assigned to this application\'s job. Use week=next if candidate asks for next week.',
    parameters: {
      type: 'object',
      properties: {
        week: { type: 'string', enum: ['auto', 'next'], default: 'auto' },
        applicationId: {
          type: 'string',
          description: 'SkillSync application id (optional if call metadata already includes it)',
        },
      },
      required: [],
    },
  },
  {
    name: 'bookInterviewSlot',
    description:
      'Book a chosen slot on the recruiter calendar and invite the candidate.',
    parameters: {
      type: 'object',
      properties: {
        applicationId: {
          type: 'string',
          description:
            'SkillSync application id (optional if call metadata already includes it)',
        },
        slotStartIso: {
          type: 'string',
          description: 'Exact startIso string from a slot returned by getInterviewSlots',
        },
      },
      required: ['slotStartIso'],
    },
  },
];

/**
 * @param {object} callbacks
 * @param {string | null} [callbacks.applicationId]
 * @param {() => void} [callbacks.onopen]
 * @param {(message: object) => void} callbacks.onmessage
 * @param {(e: object) => void} [callbacks.onerror]
 * @param {(e: object) => void} [callbacks.onclose]
 */
export async function createLiveSession(callbacks) {
  const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });

  const { baseUrl, token } = getSkillsyncConfig();
  if (!token) {
    log.warn(
      'SKILLSYNC_SERVICE_TOKEN not set — calendar/context SkillSync calls will fail until it is added to repo root .env'
    );
  } else {
    log.log(`SkillSync API base=${baseUrl} (token configured)`);
  }

  const session = await ai.live.connect({
    model: 'gemini-3.1-flash-live-preview',
    config: {
      responseModalities: [Modality.AUDIO],
      systemInstruction: {
        parts: [{ text: SYSTEM_PROMPT }],
      },
      // Basic transcript capture for CallSession (server/src/models/CallSession.js) —
      // consumed in twilio.mediaStream.js's handleGeminiMessage.
      inputAudioTranscription: {},
      outputAudioTranscription: {},
      toolConfig: {
        functionCallingConfig: {
          mode: FunctionCallingConfigMode.AUTO,
          allowedFunctionNames: toolDeclarations.map((t) => t.name),
        },
      },
      tools: [{ functionDeclarations: toolDeclarations }],
    },
    callbacks: {
      onopen: () => {
        log.log('Gemini Live session opened');
        callbacks.onopen?.();
      },
      onmessage: (message) => {
        try {
          const functionCalls = extractFunctionCalls(message);
          if (functionCalls.length > 0) {
            log.log(`Tool calls: ${functionCalls.map((c) => c?.name).join(', ')}`);
            void (async () => {
              const responses = [];
              for (const call of functionCalls) {
                const name = call?.name;
                const args = call?.args || {};
                const id = call?.id || randomUUID();
                try {
                  log.log(`Tool call ${name} args=${JSON.stringify(args)}`);
                  if (name === 'getCurrentTimeIst') {
                    const data = await skillsyncFetch(`/api/phone-agent/time`, {
                      method: 'GET',
                    });
                    responses.push({
                      id,
                      name,
                      // Live API: prefer `output` / `error` keys on function responses (see FunctionResponse in @google/genai).
                      response: { output: data },
                    });
                  } else if (name === 'getApplicationContext') {
                    const appId = args.applicationId || callbacks.applicationId;
                    if (!appId || typeof appId !== 'string') {
                      throw new Error(
                        'Missing applicationId — call metadata did not include one; cannot load context.',
                      );
                    }
                    const data = await skillsyncFetch(
                      `/api/phone-agent/applications/${encodeURIComponent(appId)}/context`,
                      { method: 'GET' },
                    );
                    responses.push({ id, name, response: { output: data } });
                  } else if (name === 'getInterviewSlots') {
                    const week = args.week === 'next' ? 'next' : 'auto';
                    const appId = args.applicationId || callbacks.applicationId;
                    if (!appId || typeof appId !== 'string') {
                      throw new Error(
                        'Missing applicationId — call metadata did not include one; cannot check availability for this job.',
                      );
                    }
                    const data = await skillsyncFetch(
                      `/api/phone-agent/calendar/availability?week=${encodeURIComponent(week)}&applicationId=${encodeURIComponent(appId)}`,
                      { method: 'GET' },
                    );
                    responses.push({ id, name, response: { output: data } });
                  } else if (name === 'bookInterviewSlot') {
                    const applicationId = args.applicationId || callbacks.applicationId;
                    if (!applicationId || typeof applicationId !== 'string') {
                      throw new Error(
                        'Missing applicationId — this call is not linked to a SkillSync application.',
                      );
                    }
                    const slotStartIso =
                      args.slotStartIso ||
                      args.startIso ||
                      args.slotStartISO ||
                      args.startISO;
                    const data = await skillsyncFetch(`/api/phone-agent/calendar/schedule`, {
                      method: 'POST',
                      body: JSON.stringify({
                        applicationId,
                        slotStartIso: slotStartIso,
                      }),
                    });
                    responses.push({ id, name, response: { output: data } });
                  } else {
                    responses.push({
                      id,
                      name,
                      response: { error: 'Unknown tool' },
                    });
                  }
                } catch (err) {
                  const msg = err instanceof Error ? err.message : String(err);
                  log.error(`Tool ${name} failed: ${msg}`);
                  responses.push({
                    id,
                    name,
                    response: { error: msg },
                  });
                }
              }
              try {
                session.sendToolResponse({ functionResponses: responses });
              } catch (err) {
                log.error('Failed sending tool responses', err);
              }
            })();
            return;
          }

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

  if (callbacks.applicationId) {
    try {
      session.sendClientContent({
        turns: [
          {
            role: 'user',
            parts: [
              {
                text:
                  `Call metadata: applicationId=${callbacks.applicationId}. ` +
                  `You may call getApplicationContext with no arguments if you need job/candidate details. ` +
                  `For scheduling, use tools — never guess the date/time.`,
              },
            ],
          },
        ],
        turnComplete: true,
      });
    } catch (err) {
      log.error('Failed to prefill application metadata', err);
    }
  }

  return session;
}
