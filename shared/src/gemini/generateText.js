import { GoogleGenerativeAI } from '@google/generative-ai';

/**
 * Single-turn text generation with Google Gemini (used by resume-analysis ATS and applications candidate scoring).
 *
 * @param {string} prompt - Full user prompt
 * @param {object} [options]
 * @param {string} [options.model] - Override model (default GEMINI_MODEL or gemini-2.0-flash)
 * @param {number} [options.temperature]
 * @param {number} [options.maxOutputTokens]
 * @returns {Promise<string>} Trimmed model text
 */
export async function generateGeminiText(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const modelName =
    options.model ||
    process.env.GEMINI_MODEL ||
    'gemini-2.0-flash';

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 2048,
    },
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text || !String(text).trim()) {
    throw new Error('Empty response from Gemini');
  }
  return String(text).trim();
}
