import { GoogleGenAI, Type } from "@google/genai";
import { SongDetails, GeneratedResult } from "../types";

// Helper to get API key safely
const getApiKey = (): string => {
  const key = process.env.API_KEY || process.env.GEMINI_API_KEY;
  if (!key) {
    throw new Error("GEMINI_API_KEY が設定されていません。.env.local ファイルに設定してください。");
  }
  return key;
};

// Lazy-initialized Gemini Client (deferred to avoid crash on import)
let _ai: GoogleGenAI | null = null;
const getAI = (): GoogleGenAI => {
  if (!_ai) {
    _ai = new GoogleGenAI({ apiKey: getApiKey() });
  }
  return _ai;
};

/**
 * Helper to parse JSON from Markdown code blocks or raw text
 */
const parseJSON = (text: string | undefined): any => {
  if (!text) return null;
  try {
    // Remove markdown code blocks if present
    const cleanText = text.replace(/```json/g, '').replace(/```/g, '').trim();
    return JSON.parse(cleanText);
  } catch (e) {
    console.error("Failed to parse JSON:", text);
    throw new Error("AI output was not valid JSON");
  }
};

/**
 * Step 1: Identify the song based on user input.
 */
export const searchSongs = async (query: string): Promise<SongDetails[]> => {
  const modelId = "gemini-2.5-flash"; // Fast model for search
  
  const prompt = `
    User Query: "${query}"

    Task:
    Search for music tracks that match the user's query.
    Context: The user is likely searching for Japanese songs (J-Pop, Rock, Enka, Anime, etc.) or popular Western songs.
    
    1. Use Google Search to identify the song.
    2. If the query is just a title (e.g. "Hana to Ame", "Itoshi no Ellie"), find the most famous artists who released a song with that title.
    3. Return a JSON array of up to 5 potential matches.

    Output JSON ONLY (No markdown, no explanation):
    [
      {
        "title": "Title",
        "artist": "Artist",
        "genre": "Genre",
        "year": "Year",
        "description": "Short description in Japanese"
      }
    ]
  `;

  const response = await getAI().models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const parsed = parseJSON(response.text);
  if (!Array.isArray(parsed)) {
    if (parsed && typeof parsed === 'object' && parsed.title) {
      return [parsed];
    }
    return [];
  }
  return parsed as SongDetails[];
};

/**
 * Step 2: Deep Analysis & Generation (Lyrics + Prompt ONLY).
 * MAXIMIZED PROMPT LENGTH.
 */
export const analyzeAndGenerate = async (song: SongDetails): Promise<GeneratedResult> => {
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    You are an expert music producer and AI prompt engineer specialized in Suno AI (v3.5).
    
    Target Song: "${song.title}" by "${song.artist}"
    
    TASK:
    1.  **RESEARCH**: Perform a THOROUGH research analysis on this song using Google Search.
        *   Identify the **EXACT SONG STRUCTURE** (Intro, A/B/Chorus, Bridge, Solo, Outro).
        *   Identify the **TOTAL DURATION** (e.g., 4:30).
    
    2.  **GENERATE**:
        
        A. **sunoPrompt** (Style Description):
           -   **STRICT LENGTH REQUIREMENT**: **700 to 999 characters**.
           -   **DO NOT BE LAZY**. Do not be concise. You MUST fill the space.
           -   **HOW TO FILL SPACE**:
               *   List **specific instrument models** (e.g., 'Fender Stratocaster with heavy chorus', 'Roland TR-808 kick', 'Yamaha CS-80 swelling pads').
               *   Describe **playing techniques** (e.g., 'palm-muted chugs', 'slap bass syncopation', 'arpeggiated synth runs', 'legato string sections').
               *   Describe **production/mixing** (e.g., 'heavy side-chain compression', 'plate reverb on vocals', 'lo-fi tape saturation', 'wall of sound mastering').
               *   Describe **vocal nuances** (e.g., 'breathy falsetto layers', 'aggressive guttural screams', 'melismatic r&b ad-libs').
               *   Describe **atmosphere** using many adjectives.
           -   **NO ARTIST NAMES**.
           
        B. **lyrics** (Full Song Content):
           -   **FULL DURATION REQUIRED**: If the original is 4 mins, write lyrics for 4 mins.
           -   **MUST INCLUDE ALL SECTIONS**: [Intro], [Verse 1], [Pre-Chorus], [Chorus], [Verse 2], [Pre-Chorus], [Chorus], [Bridge], [Solo], [Last Chorus], [Outro].
           -   **ORIGINALITY**: NO keywords or title words from the original. Completely new metaphor/theme.

    JSON Output Structure:
    {
      "reasoning": "A summary in JAPANESE. Explain the structure and why you chose these specific instruments/styles.",
      "sunoPrompt": "A MASSIVE block of text (700-999 chars).",
      "sunoPromptTranslation": "Japanese translation.",
      "lyrics": "FULL song lyrics with section tags."
    }
    
    IMPORTANT: Return ONLY the JSON object.
  `;

  const response = await getAI().models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      tools: [{ googleSearch: {} }],
    },
  });

  const json = parseJSON(response.text);
  
  const sources = response.candidates?.[0]?.groundingMetadata?.groundingChunks?.map(chunk => ({
    title: chunk.web?.title || "Source",
    uri: chunk.web?.uri || "#"
  })).filter(s => s.uri !== "#") || [];

  const uniqueSources = Array.from(new Map(sources.map(s => [s.uri, s])).values());

  return {
    ...json,
    sources: uniqueSources
  };
};

/**
 * Step 3: Refinement.
 */
export const refineResult = async (
  currentResult: GeneratedResult,
  userInstruction: string
): Promise<GeneratedResult> => {
  const modelId = "gemini-3-flash-preview";

  const prompt = `
    Current Suno Prompt: "${currentResult.sunoPrompt}"
    Current Lyrics: "${currentResult.lyrics}"

    User Instruction: "${userInstruction}"

    TASK:
    Update the content based on the instruction.
    
    CRITICAL RULES:
    1. **NO ARTIST NAMES** in sunoPrompt.
    2. **LENGTH**: **STRICTLY MAINTAIN OR INCREASE LENGTH (700-999 characters)**. DO NOT SHORTEN.
    3. **LYRICS**: Keep full structure.
    
    Output JSON structure (fill all fields even if unchanged):
    {
       "sunoPrompt": "...", 
       "sunoPromptTranslation": "...",
       "lyrics": "..."
    }
  `;

  const response = await getAI().models.generateContent({
    model: modelId,
    contents: prompt,
    config: {
      responseMimeType: "application/json",
      responseSchema: {
        type: Type.OBJECT,
        properties: {
          sunoPrompt: { type: Type.STRING },
          sunoPromptTranslation: { type: Type.STRING },
          lyrics: { type: Type.STRING }
        },
        required: ["sunoPrompt", "sunoPromptTranslation", "lyrics"],
      },
    },
  });

  const text = response.text;
  if (!text) throw new Error("No response from Gemini.");

  const json = JSON.parse(text);
  
  return {
    ...currentResult,
    ...json
  };
};