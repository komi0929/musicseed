import { supabase } from './supabaseClient';
import { v4 as uuidv4 } from 'uuid';

const STORAGE_KEY = 'musicseed_user_id';
const MAX_USAGE = 100;

/**
 * Get or create anonymous user ID stored in localStorage.
 */
export const getUserId = (): string => {
  let userId = localStorage.getItem(STORAGE_KEY);
  if (!userId) {
    userId = uuidv4();
    localStorage.setItem(STORAGE_KEY, userId);
  }
  return userId;
};

/**
 * Get current usage count from Supabase.
 * Returns 0 if no record exists yet.
 */
export const getUsageCount = async (): Promise<number> => {
  const userId = getUserId();
  
  const { data, error } = await supabase
    .from('usage')
    .select('count')
    .eq('user_id', userId)
    .single();

  if (error && error.code === 'PGRST116') {
    // No row found — first time user
    return 0;
  }
  if (error) {
    console.error('Usage count fetch error:', error);
    return 0;
  }
  return data?.count ?? 0;
};

/**
 * Increment usage count. Creates record if first use.
 * Returns the new count.
 */
export const incrementUsage = async (): Promise<number> => {
  const userId = getUserId();
  
  const { data, error } = await supabase
    .rpc('increment_usage', { p_user_id: userId });

  if (error) {
    console.error('Usage increment error:', error);
    return 0;
  }
  return data ?? 0;
};

/**
 * Check if user has remaining uses.
 */
export const hasRemainingUses = async (): Promise<{ allowed: boolean; count: number; remaining: number }> => {
  const count = await getUsageCount();
  return {
    allowed: count < MAX_USAGE,
    count,
    remaining: Math.max(0, MAX_USAGE - count),
  };
};

export const MAX_USES = MAX_USAGE;
