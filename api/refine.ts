import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI, Type } from '@google/genai';

let _ai: GoogleGenAI | null = null;
const getAI = (): GoogleGenAI => {
  if (!_ai) {
    const key = process.env.GEMINI_API_KEY;
    if (!key) throw new Error('GEMINI_API_KEY is not set');
    _ai = new GoogleGenAI({ apiKey: key });
  }
  return _ai;
};

const parseJSON = (text: string | undefined): any => {
  if (!text) return null;
  const clean = text.replace(/```json/g, '').replace(/```/g, '').trim();
  return JSON.parse(clean);
};

const sanitize = (s: string, maxLen = 200): string =>
  s.replace(/[`${}\\\"]/g, '').slice(0, maxLen);

export default async function handler(req: VercelRequest, res: VercelResponse) {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('X-Frame-Options', 'DENY');
  res.setHeader('Referrer-Policy', 'strict-origin-when-cross-origin');
  res.setHeader('Access-Control-Allow-Origin', '*');
  res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
  res.setHeader('Access-Control-Allow-Headers', 'Content-Type');

  if (req.method === 'OPTIONS') return res.status(200).end();
  if (req.method !== 'POST') return res.status(405).json({ error: 'Method not allowed' });

  try {
    const sunoPrompt = sanitize(String(req.body?.sunoPrompt ?? ''), 1200);
    const lyrics = String(req.body?.lyrics ?? '').replace(/[`${}\\]/g, '').slice(0, 5000);
    const instruction = sanitize(String(req.body?.instruction ?? ''), 500);
    if (!instruction) return res.status(400).json({ error: 'instruction is required' });

    const prompt = `
      Current Suno Prompt: "${sunoPrompt}"
      Current Lyrics: "${lyrics}"
      User Instruction: "${instruction}"
      TASK: Update the content based on the instruction.
      CRITICAL RULES:
      1. NO ARTIST NAMES in sunoPrompt.
      2. LENGTH: STRICTLY MAINTAIN OR INCREASE LENGTH (700-999 characters). DO NOT SHORTEN.
      3. LYRICS: Keep full structure.
      Output JSON structure (fill all fields even if unchanged):
      { "reasoning": "A brief summary in JAPANESE of what you changed and why.", "sunoPrompt": "...", "sunoPromptTranslation": "...", "lyrics": "..." }
    `;

    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: {
        responseMimeType: 'application/json',
        responseSchema: {
          type: Type.OBJECT,
          properties: {
            reasoning: { type: Type.STRING },
            sunoPrompt: { type: Type.STRING },
            sunoPromptTranslation: { type: Type.STRING },
            lyrics: { type: Type.STRING },
          },
          required: ['reasoning', 'sunoPrompt', 'sunoPromptTranslation', 'lyrics'],
        },
      },
    });

    const text = response.text;
    if (!text) return res.status(500).json({ error: 'No response from Gemini.' });
    return res.status(200).json(parseJSON(text));
  } catch (err: any) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    console.error('[API] /api/refine error:', message);
    return res.status(status).json({ error: message });
  }
}
