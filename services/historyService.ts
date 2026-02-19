import { SongDetails, GeneratedResult } from '../types';

const STORAGE_KEY = 'musicseed_history';
const MAX_ITEMS = 20;

export interface HistoryItem {
  id: string;
  song: SongDetails;
  result: GeneratedResult;
  createdAt: string;
}

/**
 * Save a generation result to history.
 */
export const saveToHistory = (song: SongDetails, result: GeneratedResult): void => {
  try {
    const history = getHistory();
    const item: HistoryItem = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2, 8)}`,
      song,
      result,
      createdAt: new Date().toISOString(),
    };
    history.unshift(item);
    // Keep only the most recent items
    const trimmed = history.slice(0, MAX_ITEMS);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(trimmed));
  } catch (e) {
    console.error('Failed to save history:', e);
  }
};

/**
 * Get all history items, most recent first.
 */
export const getHistory = (): HistoryItem[] => {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return [];
    return JSON.parse(raw) as HistoryItem[];
  } catch (e) {
    console.error('Failed to load history:', e);
    return [];
  }
};

/**
 * Delete a single history item by ID.
 */
export const deleteHistoryItem = (id: string): void => {
  try {
    const history = getHistory().filter(item => item.id !== id);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(history));
  } catch (e) {
    console.error('Failed to delete history item:', e);
  }
};

/**
 * Clear all history.
 */
export const clearHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEY);
  } catch (e) {
    console.error('Failed to clear history:', e);
  }
};
