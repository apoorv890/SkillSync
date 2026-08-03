import { GoogleGenerativeAI } from '@google/generative-ai';

export async function generateGeminiText(prompt, options = {}) {
  const apiKey = process.env.GEMINI_API_KEY;
  if (!apiKey) {
    throw new Error('GEMINI_API_KEY is not set');
  }

  const modelName = options.model || process.env.GEMINI_MODEL;
  if (!modelName) {
    throw new Error('GEMINI_MODEL is not set');
  }

  const genAI = new GoogleGenerativeAI(apiKey);
  const model = genAI.getGenerativeModel({
    model: modelName,
    generationConfig: {
      temperature: options.temperature ?? 0.3,
      maxOutputTokens: options.maxOutputTokens ?? 2048
    }
  });

  const result = await model.generateContent(prompt);
  const text = result.response.text();
  if (!text || !String(text).trim()) {
    throw new Error('Empty response from Gemini');
  }
  return String(text).trim();
}

