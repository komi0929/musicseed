import type { VercelRequest, VercelResponse } from '@vercel/node';
import { GoogleGenAI } from '@google/genai';

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
    const title = sanitize(String(req.body?.title ?? ''), 200);
    const artist = sanitize(String(req.body?.artist ?? ''), 200);
    if (!title || !artist) return res.status(400).json({ error: 'title and artist are required' });

    const prompt = `
      You are an expert music producer and AI prompt engineer specialized in Suno AI (v3.5).
      Target Song: "${title}" by "${artist}"
      TASK:
      1. RESEARCH: Perform a THOROUGH research analysis on this song using Google Search.
         - Identify the EXACT SONG STRUCTURE (Intro, A/B/Chorus, Bridge, Solo, Outro).
         - Identify the TOTAL DURATION (e.g., 4:30).
      2. GENERATE:
         A. sunoPrompt (Style Description):
            - STRICT LENGTH REQUIREMENT: 700 to 999 characters.
            - DO NOT BE LAZY. You MUST fill the space.
            - HOW TO FILL SPACE: List specific instrument models, describe playing techniques, production/mixing, vocal nuances, atmosphere using many adjectives.
            - NO ARTIST NAMES.
         B. lyrics (Full Song Content):
            - LANGUAGE: Write lyrics in the SAME LANGUAGE as the original song.
            - FULL DURATION REQUIRED.
            - MUST INCLUDE ALL SECTIONS: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Solo], [Last Chorus], [Outro].
            - ORIGINALITY: NO keywords or title words from the original. Completely new metaphor/theme.
      JSON Output Structure:
      {
        "reasoning": "A summary in JAPANESE.",
        "sunoPrompt": "A MASSIVE block of text (700-999 chars).",
        "sunoPromptTranslation": "Japanese translation.",
        "lyrics": "FULL song lyrics with section tags."
      }
      IMPORTANT: Return ONLY the JSON object.
    `;

    const response = await getAI().models.generateContent({
      model: 'gemini-3-flash-preview',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }] },
    });

    const json = parseJSON(response.text);

    const sources =
      response.candidates?.[0]?.groundingMetadata?.groundingChunks
        ?.map((chunk) => ({
          title: chunk.web?.title || 'Source',
          uri: chunk.web?.uri || '#',
        }))
        .filter((s) => s.uri !== '#') || [];

    const uniqueSources = Array.from(
      new Map(sources.map((s) => [s.uri, s])).values()
    );

    return res.status(200).json({ ...json, sources: uniqueSources });
  } catch (err: any) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    console.error('[API] /api/analyze error:', message);
    return res.status(status).json({ error: message });
  }
}
