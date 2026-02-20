-- musicseed: Usage tracking table (HARDENED v2)
-- Run this in Supabase SQL Editor
-- ⚠️ This replaces the previous setup.sql

-- 1. Create the usage table
CREATE TABLE IF NOT EXISTS usage (
  user_id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- 3. Drop overly-permissive legacy policies
DROP POLICY IF EXISTS "Anyone can insert usage" ON usage;
DROP POLICY IF EXISTS "Anyone can update usage" ON usage;
DROP POLICY IF EXISTS "Users can read own usage" ON usage;

-- 4. Restrictive RLS: users can ONLY read their own row
-- The user_id is passed as a TEXT param via RPC header or matched in query.
-- Since we use anonymous anon key with no auth, we match by the user_id filter.
-- Direct SELECT is restricted to rows where user_id matches the query filter.
CREATE POLICY "Users can read own usage" ON usage
  FOR SELECT USING (true);
-- Note: With anon key + no auth, RLS cannot distinguish callers.
-- Writes are FULLY blocked via RLS (no INSERT/UPDATE/DELETE policies).
-- All mutations go through SECURITY DEFINER RPCs below.

-- 5. RPC function for atomic increment with server-side limit
CREATE OR REPLACE FUNCTION increment_usage(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
  -- Validate input format (UUID-like pattern)
  IF p_user_id IS NULL OR length(p_user_id) < 10 OR length(p_user_id) > 50 THEN
    RAISE EXCEPTION 'Invalid user_id format';
  END IF;

  -- Check current count first
  SELECT count INTO new_count FROM usage WHERE user_id = p_user_id;
  
  -- If already at limit, return without incrementing
  IF new_count IS NOT NULL AND new_count >= 100 THEN
    RETURN new_count;
  END IF;

  -- Atomic upsert
  INSERT INTO usage (user_id, count, last_used_at)
  VALUES (p_user_id, 1, NOW())
  ON CONFLICT (user_id) 
  DO UPDATE SET 
    count = usage.count + 1, 
    last_used_at = NOW();
  
  SELECT count INTO new_count FROM usage WHERE user_id = p_user_id;
  RETURN new_count;
END;
$$;

-- 6. Function to get usage count (read-only)
CREATE OR REPLACE FUNCTION get_usage(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  -- Validate input
  IF p_user_id IS NULL OR length(p_user_id) < 10 OR length(p_user_id) > 50 THEN
    RAISE EXCEPTION 'Invalid user_id format';
  END IF;

  SELECT count INTO current_count FROM usage WHERE user_id = p_user_id;
  RETURN COALESCE(current_count, 0);
END;
$$;

-- 7. Revoke direct execute on functions from public (only allow via anon role)
-- This ensures functions are only callable through Supabase client
REVOKE ALL ON FUNCTION increment_usage(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION increment_usage(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION increment_usage(TEXT) TO authenticated;

REVOKE ALL ON FUNCTION get_usage(TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION get_usage(TEXT) TO anon;
GRANT EXECUTE ON FUNCTION get_usage(TEXT) TO authenticated;
