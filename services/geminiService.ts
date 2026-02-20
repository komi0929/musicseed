/**
 * Client-side Gemini service — calls server-side /api/* proxy.
 * The API key NEVER reaches the browser.
 */
import { SongDetails, GeneratedResult } from "../types";

/**
 * Helper: call the server-side proxy and handle errors.
 */
const apiFetch = async <T>(endpoint: string, body: Record<string, unknown>): Promise<T> => {
  const res = await fetch(`/api/${endpoint}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });

  if (!res.ok) {
    const err = await res.json().catch(() => ({ error: "Unknown error" }));
    if (res.status === 429) {
      throw new Error("リクエスト制限に達しました。少し待ってから再試行してください。");
    }
    throw new Error(err.error || `API error (${res.status})`);
  }

  return res.json();
};

/**
 * Step 1: Identify the song based on user input.
 */
export const searchSongs = async (query: string): Promise<SongDetails[]> => {
  const results = await apiFetch<SongDetails[]>("search", { query });
  return results;
};

/**
 * Step 2: Deep Analysis & Generation.
 */
export const analyzeAndGenerate = async (song: SongDetails): Promise<GeneratedResult> => {
  const result = await apiFetch<GeneratedResult>("analyze", {
    title: song.title,
    artist: song.artist,
  });
  return result;
};

/**
 * Step 3: Refinement.
 */
export const refineResult = async (
  currentResult: GeneratedResult,
  userInstruction: string
): Promise<GeneratedResult> => {
  const refined = await apiFetch<GeneratedResult>("refine", {
    sunoPrompt: currentResult.sunoPrompt,
    lyrics: currentResult.lyrics,
    instruction: userInstruction,
  });
  return {
    ...currentResult,
    ...refined,
  };
};