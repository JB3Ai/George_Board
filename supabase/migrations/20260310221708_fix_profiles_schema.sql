-- Fix profiles table: replace user_id UUID schema with email TEXT PRIMARY KEY
-- The old table had user_id UUID but the edge function needs email TEXT PK.
-- Table is currently empty so this is safe.

DROP TABLE IF EXISTS public.profiles CASCADE;

CREATE TABLE public.profiles (
  email            TEXT PRIMARY KEY,
  display_name     TEXT,
  pin_hash         TEXT,
  pin_salt         TEXT,
  failed_pin_count INTEGER DEFAULT 0,
  pin_lock_until   TIMESTAMP WITH TIME ZONE,
  theme            TEXT DEFAULT 'NEON',
  font_size        TEXT DEFAULT 'SMALL',
  is_super_admin   BOOLEAN DEFAULT false,
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
-- No client-facing policies. Service role only.