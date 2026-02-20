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
    const query = sanitize(String(req.body?.query ?? ''), 200);
    if (!query) return res.status(400).json({ error: 'query is required' });

    const prompt = `
      User Query: "${query}"
      Task: Search for music tracks that match the user's query.
      Context: The user is likely searching for Japanese songs (J-Pop, Rock, Enka, Anime, etc.) or popular Western songs.
      1. Use Google Search to identify the song.
      2. If the query is just a title, find the most famous artists who released a song with that title.
      3. Return a JSON array of up to 5 potential matches.
      Output JSON ONLY (No markdown, no explanation):
      [{ "title": "Title", "artist": "Artist", "genre": "Genre", "year": "Year", "description": "Short description in Japanese" }]
    `;

    const response = await getAI().models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { tools: [{ googleSearch: {} }], temperature: 0.5 },
    });

    const parsed = parseJSON(response.text);
    if (!Array.isArray(parsed)) {
      if (parsed && typeof parsed === 'object' && parsed.title) return res.status(200).json([parsed]);
      return res.status(404).json({ error: '楽曲が見つかりませんでした' });
    }
    if (parsed.length === 0) return res.status(404).json({ error: '楽曲が見つかりませんでした' });
    return res.status(200).json(parsed);
  } catch (err: any) {
    const status = err.status || 500;
    const message = err.message || 'Internal server error';
    console.error('[API] /api/search error:', message);
    return res.status(status).json({ error: message });
  }
}
