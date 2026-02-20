/**
 * Server-side API proxy for Gemini.
 * Keeps the API key on the server — NEVER sent to the browser.
 * Used by the Vite dev server plugin (server/vitePlugin.ts).
 */
import { GoogleGenAI, Type } from "@google/genai";

// ---- helpers ----
const getApiKey = (): string => {
  const key = process.env.GEMINI_API_KEY;
  if (!key) throw new Error("GEMINI_API_KEY is not set");
  return key;
};

let _ai: GoogleGenAI | null = null;
const getAI = (): GoogleGenAI => {
  if (!_ai) _ai = new GoogleGenAI({ apiKey: getApiKey() });
  return _ai;
};

const parseJSON = (text: string | undefined): any => {
  if (!text) return null;
  try {
    const clean = text.replace(/```json/g, "").replace(/```/g, "").trim();
    return JSON.parse(clean);
  } catch {
    throw { status: 500, message: "AIレスポンスの解析に失敗しました。再試行してください。" };
  }
};

/**
 * Sanitize user input — strips dangerous chars and limits length
 */
const sanitize = (s: string, maxLen = 200): string =>
  s.replace(/[`${}\\\"]/g, "").slice(0, maxLen);

/**
 * Rate-limit map: IP -> { lastCall, callCount }
 * Simple in-memory per-process. Resets on cold start.
 * NOTE: On serverless (Vercel), each invocation may use a different instance,
 * so this only provides partial protection. For full rate-limiting, use
 * Vercel's built-in WAF or an external service (e.g., Upstash Redis).
 */
const rateLimitMap = new Map<string, { ts: number; count: number }>();
const RATE_WINDOW_MS = 60_000;  // 1-min window
const RATE_MAX_CALLS = 10;       // max 10 calls per window
let _lastCleanup = Date.now();

function checkRateLimit(ip: string): boolean {
  const now = Date.now();

  // Inline cleanup every 5 minutes
  if (now - _lastCleanup > 300_000) {
    _lastCleanup = now;
    for (const [key, entry] of rateLimitMap) {
      if (now - entry.ts > RATE_WINDOW_MS * 5) rateLimitMap.delete(key);
    }
  }

  const entry = rateLimitMap.get(ip);
  if (!entry || now - entry.ts > RATE_WINDOW_MS) {
    rateLimitMap.set(ip, { ts: now, count: 1 });
    return true;
  }
  if (entry.count >= RATE_MAX_CALLS) return false;
  entry.count++;
  return true;
}

// ---- route handlers ----

export async function handleSearchSongs(body: any, ip: string) {
  if (!checkRateLimit(ip)) throw { status: 429, message: "Rate limit exceeded" };

  const query = sanitize(String(body.query ?? ""), 200);
  if (!query) throw { status: 400, message: "query is required" };

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
    model: "gemini-2.5-flash",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }], temperature: 0.5 },
  });

  const parsed = parseJSON(response.text);
  if (!Array.isArray(parsed)) {
    if (parsed && typeof parsed === "object" && parsed.title) return [parsed];
    throw { status: 404, message: "楽曲が見つかりませんでした" };
  }
  if (parsed.length === 0) {
    throw { status: 404, message: "楽曲が見つかりませんでした" };
  }
  return parsed;
}

export async function handleAnalyze(body: any, ip: string) {
  if (!checkRateLimit(ip)) throw { status: 429, message: "Rate limit exceeded" };

  const title = sanitize(String(body.title ?? ""), 200);
  const artist = sanitize(String(body.artist ?? ""), 200);
  if (!title || !artist) throw { status: 400, message: "title and artist are required" };

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
    { "reasoning": "A summary in JAPANESE.", "sunoPrompt": "A MASSIVE block of text (700-999 chars).", "sunoPromptTranslation": "Japanese translation.", "lyrics": "FULL song lyrics with section tags." }
    IMPORTANT: Return ONLY the JSON object.
  `;

  const response = await getAI().models.generateContent({
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: { tools: [{ googleSearch: {} }] },
  });

  const json = parseJSON(response.text);

  const sources =
    response.candidates?.[0]?.groundingMetadata?.groundingChunks
      ?.map((chunk) => ({
        title: chunk.web?.title || "Source",
        uri: chunk.web?.uri || "#",
      }))
      .filter((s) => s.uri !== "#") || [];

  const uniqueSources = Array.from(
    new Map(sources.map((s) => [s.uri, s])).values()
  );

  return { ...json, sources: uniqueSources };
}

export async function handleRefine(body: any, ip: string) {
  if (!checkRateLimit(ip)) throw { status: 429, message: "Rate limit exceeded" };

  const sunoPrompt = sanitize(String(body.sunoPrompt ?? ""), 1200);
  const lyrics = String(body.lyrics ?? "").replace(/[`${}\\]/g, "").slice(0, 5000);
  const instruction = sanitize(String(body.instruction ?? ""), 500);
  if (!instruction) throw { status: 400, message: "instruction is required" };

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
    model: "gemini-3-flash-preview",
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          reasoning: { type: Type.STRING },
          sunoPrompt: { type: Type.STRING },
          sunoPromptTranslation: { type: Type.STRING },
          lyrics: { type: Type.STRING },
        },
        required: ["reasoning", "sunoPrompt", "sunoPromptTranslation", "lyrics"],
      },
    },
  });

  const text = response.text;
  if (!text) throw { status: 500, message: "No response from Gemini." };
  return parseJSON(text);
}
