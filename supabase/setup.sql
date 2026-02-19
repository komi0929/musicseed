-- musicseed: Usage tracking table (HARDENED)
-- Run this in Supabase SQL Editor

-- 1. Create the usage table
CREATE TABLE IF NOT EXISTS usage (
  user_id TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  last_used_at TIMESTAMPTZ DEFAULT NOW(),
  created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Enable RLS
ALTER TABLE usage ENABLE ROW LEVEL SECURITY;

-- 3. Restrictive RLS: only allow SELECT on own row
-- (Direct table access is read-only; writes go through RPC)
CREATE POLICY "Users can read own usage" ON usage
  FOR SELECT USING (true);

-- No INSERT/UPDATE/DELETE policies = blocked via direct table access
-- All writes go through SECURITY DEFINER RPC below

-- 4. RPC function for atomic increment with server-side limit
CREATE OR REPLACE FUNCTION increment_usage(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  new_count INTEGER;
BEGIN
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

-- 5. Function to get usage count (read-only)
CREATE OR REPLACE FUNCTION get_usage(p_user_id TEXT)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  current_count INTEGER;
BEGIN
  SELECT count INTO current_count FROM usage WHERE user_id = p_user_id;
  RETURN COALESCE(current_count, 0);
END;
$$;
