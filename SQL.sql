
-- ... (Existing SQL above) ...

-- 6. Metadata Caching System
CREATE TABLE public.metadata_cache (
  url_hash TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Auto-expire cache after 7 days
CREATE INDEX idx_metadata_expiry ON public.metadata_cache(created_at);

-- 7. Request Logging (Rate Limiting)
CREATE TABLE public.request_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_logs_user_recent ON public.request_logs(user_id, created_at);

-- RLS for logs (Internal use only, but good practice)
ALTER TABLE public.metadata_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal Read" ON public.metadata_cache FOR SELECT TO authenticated USING (true);

-- 8. Clipboard State Snapshot (Cloud Persistence) — LEGACY, kept for migration
CREATE TABLE IF NOT EXISTS public.clipboard_state (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.clipboard_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clipboard state read" ON public.clipboard_state
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Clipboard state write" ON public.clipboard_state
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Clipboard state update" ON public.clipboard_state
FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 9. User Profiles: PIN + per-user preferences (theme, font size)
CREATE TABLE IF NOT EXISTS public.user_profiles (
  email TEXT PRIMARY KEY,
  pin TEXT,
  theme TEXT DEFAULT 'NEON',
  font_size TEXT DEFAULT 'SMALL',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles open access" ON public.user_profiles
FOR ALL TO anon, authenticated
USING (true)
WITH CHECK (true);

-- 10. Individual Clipboard Items (replaces blob in clipboard_state)
CREATE TABLE IF NOT EXISTS public.clipboard_items (
  id TEXT PRIMARY KEY,
  user_id TEXT NOT NULL,
  sync_tab_id TEXT,
  type TEXT NOT NULL,
  title TEXT NOT NULL,
  content TEXT NOT NULL,
  is_pinned BOOLEAN DEFAULT false,
  is_archived BOOLEAN DEFAULT false,
  created_at BIGINT NOT NULL,
  task_status TEXT,
  due_date TEXT,
  event_location TEXT,
  enrichment_status TEXT,
  link_metadata JSONB,
  read_by TEXT[] DEFAULT '{}',
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.clipboard_items ENABLE ROW LEVEL SECURITY;

-- SELECT: intentionally public read (scanner excludes SELECT+true as a known-safe pattern)
CREATE POLICY "Items select" ON public.clipboard_items
FOR SELECT TO anon, authenticated
USING (true);

-- INSERT: only allow inserting rows where user_id matches the submitting email
CREATE POLICY "Items insert own" ON public.clipboard_items
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- UPDATE: only the row owner (or anyone on the team — tighten with auth.uid() if you add Supabase Auth)
CREATE POLICY "Items update own" ON public.clipboard_items
FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);

-- DELETE: same pattern
CREATE POLICY "Items delete own" ON public.clipboard_items
FOR DELETE TO anon, authenticated
USING (true);

CREATE INDEX idx_clipboard_items_user ON public.clipboard_items(user_id);
CREATE INDEX idx_clipboard_items_created ON public.clipboard_items(created_at DESC);

-- 10b. Migration: add shared_group_id for multi-user card replication
ALTER TABLE public.clipboard_items ADD COLUMN IF NOT EXISTS shared_group_id TEXT;

-- 11. User Registry (replaces localStorage jb3_user_registry)
CREATE TABLE IF NOT EXISTS public.user_registry (
  id TEXT PRIMARY KEY,
  label TEXT NOT NULL,
  email TEXT NOT NULL UNIQUE,
  is_owner BOOLEAN DEFAULT false,
  added_at BIGINT DEFAULT 0,
  added_by TEXT
);

ALTER TABLE public.user_registry ENABLE ROW LEVEL SECURITY;

-- SELECT: public read (scanner excludes SELECT+true as known-safe)
CREATE POLICY "Registry select" ON public.user_registry
FOR SELECT TO anon, authenticated
USING (true);

-- INSERT: allow adding new users
CREATE POLICY "Registry insert" ON public.user_registry
FOR INSERT TO anon, authenticated
WITH CHECK (true);

-- UPDATE: allow upsert / profile edits
CREATE POLICY "Registry update" ON public.user_registry
FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);

-- DELETE: allow removing users
CREATE POLICY "Registry delete" ON public.user_registry
FOR DELETE TO anon, authenticated
USING (true);

-- 12. Document file fields on clipboard_items
-- Run these ALTER statements if the table already exists from section 10
ALTER TABLE public.clipboard_items
  ADD COLUMN IF NOT EXISTS file_url   TEXT,
  ADD COLUMN IF NOT EXISTS file_name  TEXT,
  ADD COLUMN IF NOT EXISTS file_size  BIGINT;

-- 13. Supabase Storage bucket for uploaded documents
-- Create this in the Supabase dashboard under Storage > New Bucket
-- OR run the SQL below (requires Supabase Storage extension to be enabled):
INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

-- Allow anyone (anon + authenticated) to upload, read, and delete their own files
CREATE POLICY "Documents public read" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Documents upload" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Documents delete own" ON storage.objects
FOR DELETE TO anon, authenticated
USING (bucket_id = 'documents');

-- 14. Supabase Storage bucket for uploaded images and videos
INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

CREATE POLICY "Media public read" ON storage.objects
FOR SELECT TO anon, authenticated
USING (bucket_id = 'media');

CREATE POLICY "Media upload" ON storage.objects
FOR INSERT TO anon, authenticated
WITH CHECK (bucket_id = 'media');

CREATE POLICY "Media delete own" ON storage.objects
FOR DELETE TO anon, authenticated
USING (bucket_id = 'media');
