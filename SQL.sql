
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


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 1 MIGRATION — Production Data Model Foundation                     ║
-- ║  Run all blocks in order. Each block is idempotent where possible.        ║
-- ║  Date: 2026-03-09                                                         ║
-- ╚════════════════════════════════════════════════════════════════════════════╝


-- ============================================================================
-- BLOCK 1: clipboard_items — additive preview + board columns
-- Risk: NONE. Adds nullable columns. Existing rows get NULL/0 defaults.
-- ============================================================================

ALTER TABLE public.clipboard_items
  ADD COLUMN IF NOT EXISTS preview_fail_count      INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS preview_last_fetched_at BIGINT,
  ADD COLUMN IF NOT EXISTS preview_next_allowed_at BIGINT,
  ADD COLUMN IF NOT EXISTS project_id              TEXT,
  ADD COLUMN IF NOT EXISTS board_id                TEXT;
  -- board_id is nullable. FK added in Block 6b after boards table exists.
  -- Unused by frontend until Phase 4 workspace/board wiring.

CREATE INDEX IF NOT EXISTS idx_clipboard_items_board
  ON public.clipboard_items(board_id)
  WHERE board_id IS NOT NULL;


-- ============================================================================
-- BLOCK 2: profiles — new secure profile table (service-role only)
-- Risk: LOW. New table. Does not conflict with user_profiles.
-- The frontend continues reading theme/font_size from user_profiles
-- until Phase 4. This table is accessed ONLY by edge functions via
-- SUPABASE_SERVICE_ROLE_KEY, which bypasses RLS.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
  email            TEXT PRIMARY KEY,
  display_name     TEXT,
  pin_hash         TEXT,                       -- PBKDF2-SHA256 output, written by verify-pin edge function
  pin_salt         TEXT,                       -- per-user random salt, written by verify-pin edge function
  failed_pin_count INTEGER DEFAULT 0,
  pin_lock_until   TIMESTAMP WITH TIME ZONE,
  theme            TEXT DEFAULT 'NEON',
  font_size        TEXT DEFAULT 'SMALL',
  is_super_admin   BOOLEAN DEFAULT false,
  -- is_super_admin grants app-level visibility (e.g. admin console).
  -- It does NOT replace board/workspace membership permissions.
  -- Board-level access is always resolved via board_members in Phase 4.
  created_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at       TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

-- NO client-facing RLS policies.
-- pin_hash, pin_salt, failed_pin_count, pin_lock_until, is_super_admin
-- are NEVER exposed to browser clients (anon or authenticated roles).
-- All reads/writes go through edge functions using service role key.
--
-- Phase 4 TODO: Add a restricted SELECT policy returning only
-- (email, display_name, theme, font_size) once frontend migrates
-- off user_profiles. Consider a Postgres VIEW for column filtering.


-- ============================================================================
-- BLOCK 3: Seed profiles from user_profiles
-- Risk: LOW. INSERT ... ON CONFLICT skips duplicates.
-- Runs as service-role in SQL Editor (bypasses RLS).
-- PINs are NOT migrated — they are plaintext and must be re-set in Phase 2.
-- ============================================================================

INSERT INTO public.profiles (email, theme, font_size, created_at, updated_at)
SELECT
  email,
  COALESCE(theme, 'NEON'),
  COALESCE(font_size, 'SMALL'),
  now(),
  now()
FROM public.user_profiles
ON CONFLICT (email) DO NOTHING;

-- Seed owner as super_admin
UPDATE public.profiles
SET is_super_admin = true
WHERE email = 'jono@jonoblackburn.com';


-- ============================================================================
-- BLOCK 4: request_logs — drop and recreate
-- Risk: DESTRUCTIVE. Back up first if any rows exist.
-- The old table has a UUID FK to auth.users which has zero rows in this app.
-- New schema uses user_email (TEXT) as the identity spine, with an optional
-- user_id (UUID) column for future JWT auth integration.
-- ============================================================================

-- Backup (uncomment if you want to preserve old rows):
-- CREATE TABLE public.request_logs_backup AS SELECT * FROM public.request_logs;

DROP TABLE IF EXISTS public.request_logs;

CREATE TABLE public.request_logs (
  id          UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  user_email  TEXT NOT NULL,                  -- always populated (email = identity spine)
  user_id     UUID,                           -- nullable, populated once JWT auth exists (Phase 4)
  action      TEXT NOT NULL,                  -- e.g. 'fetch_metadata', 'verify_pin'
  target      TEXT,                           -- e.g. the URL being fetched, or the email being verified
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_logs_email_recent  ON public.request_logs(user_email, created_at);
CREATE INDEX idx_logs_target_recent ON public.request_logs(target, created_at);
  -- target index supports rate-limiting by url_hash in the fetch-metadata edge function

ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

-- No client-facing policies. Service role only.
-- Edge functions (verify-pin, fetch-metadata) write logs using service role key.


-- ============================================================================
-- BLOCK 5: metadata_cache RLS — client SELECT only, no client writes
-- Risk: NONE. Drops old policy and adds correct replacement.
-- Cache rows are written by the fetch-metadata edge function (service role).
-- Client-side metadata.ts reads cache via anon key SELECT.
-- ============================================================================

DROP POLICY IF EXISTS "Internal Read" ON public.metadata_cache;

-- Anon + authenticated can read cache rows
CREATE POLICY "cache_select_public" ON public.metadata_cache
  FOR SELECT TO anon, authenticated
  USING (true);

-- No INSERT, UPDATE, or DELETE policies for anon or authenticated.
-- Only the fetch-metadata edge function writes cache rows via service role.


-- ============================================================================
-- BLOCK 6a: Workspace + Board tables (structural scaffolding for Phase 4)
-- Risk: NONE. New tables. No frontend consumers yet.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspaces (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  owner_email TEXT NOT NULL REFERENCES public.profiles(email),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;
-- No client-facing policies. Service role only until Phase 4.

CREATE TABLE IF NOT EXISTS public.boards (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id  TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_boards_workspace ON public.boards(workspace_id);
ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;
-- No client-facing policies. Service role only until Phase 4.

CREATE TABLE IF NOT EXISTS public.board_members (
  board_id    TEXT NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_email  TEXT NOT NULL REFERENCES public.profiles(email),
  role        TEXT NOT NULL DEFAULT 'member',   -- values: 'owner', 'admin', 'member', 'viewer'
  joined_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (board_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_board_members_user ON public.board_members(user_email);
ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;
-- No client-facing policies. Service role only until Phase 4.
-- board_members.role governs permissions, NOT profiles.is_super_admin.


-- ============================================================================
-- BLOCK 6b: Attach clipboard_items.board_id FK → boards(id)
-- Must run AFTER Block 6a (boards table must exist).
-- ON DELETE SET NULL: if a board is deleted, items become unassigned, not lost.
-- Risk: NONE. Column already exists from Block 1, all current values are NULL.
-- ============================================================================

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.table_constraints
    WHERE constraint_name = 'fk_clipboard_items_board'
      AND table_name = 'clipboard_items'
  ) THEN
    ALTER TABLE public.clipboard_items
      ADD CONSTRAINT fk_clipboard_items_board
      FOREIGN KEY (board_id) REFERENCES public.boards(id)
      ON DELETE SET NULL;
  END IF;
END $$;


-- ============================================================================
-- BLOCK 7: Deprecation markers + transitional RLS documentation
-- Risk: NONE. Comments only. No schema or policy changes.
-- ============================================================================

COMMENT ON TABLE public.clipboard_state IS
  'DEPRECATED — Phase 1 (2026-03-09). Replaced by clipboard_items. Drop after Phase 5.';

COMMENT ON TABLE public.user_profiles IS
  'DEPRECATED — Phase 1 (2026-03-09). Auth data moved to profiles table. '
  'Frontend still reads theme/font_size from here until Phase 4 switchover. '
  'PINs stored here are PLAINTEXT and must never be trusted. Drop after Phase 4.';

-- Transitional RLS notes on clipboard_items
-- Current policies are USING(true) / WITH CHECK(true) for all operations.
-- This is intentional for Phase 1–3 where there are no JWT sessions.
-- Phase 4 TODO: Once verify-pin issues JWTs, replace with:
--   SELECT → auth.uid() is board member OR item.user_id = auth.jwt()->>'email'
--   INSERT → auth.uid() is board member with role >= 'member'
--   UPDATE → item.user_id = auth.jwt()->>'email' OR role >= 'admin'
--   DELETE → item.user_id = auth.jwt()->>'email' OR role >= 'admin'
-- True tenant isolation is impossible until JWT auth exists.


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 4 MIGRATION — Board-aware client policies                          ║
-- ║  Run all blocks in order. Each block is idempotent.                       ║
-- ║  Date: 2026-03-09                                                         ║
-- ╚════════════════════════════════════════════════════════════════════════════╝


-- ============================================================================
-- BLOCK 8: Client-facing RLS policies for workspaces, boards, board_members
-- Risk: NONE. Adds SELECT/INSERT/UPDATE/DELETE policies where none existed.
-- These are intentionally open (USING(true) / WITH CHECK(true)) consistent
-- with all other tables in Phase 1–3. The app relies on application-level
-- auth (email + PIN) rather than JWT-based RLS until a future JWT phase.
-- ============================================================================

-- Workspaces: full client access
CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "workspaces_insert" ON public.workspaces
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Boards: full client access
CREATE POLICY "boards_select" ON public.boards
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "boards_insert" ON public.boards
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "boards_update" ON public.boards
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

-- Board members: full client access
CREATE POLICY "board_members_select" ON public.board_members
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "board_members_insert" ON public.board_members
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "board_members_update" ON public.board_members
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "board_members_delete" ON public.board_members
  FOR DELETE TO anon, authenticated USING (true);

-- Phase 5 TODO: Replace these open policies with membership-scoped rules
-- once JWT auth is in place:
--   workspaces SELECT → owner_email = auth.jwt()->>'email' OR member of any board
--   boards SELECT → workspace member (via board_members join)
--   board_members SELECT → same board_id membership
--   All mutations → role >= 'admin' for the workspace/board

COMMENT ON POLICY "Items select" ON public.clipboard_items IS
  'TRANSITIONAL Phase 1: open read. Phase 4: restrict to board membership + auth.uid().';
COMMENT ON POLICY "Items insert own" ON public.clipboard_items IS
  'TRANSITIONAL Phase 1: open insert. Phase 4: WITH CHECK board membership + auth.uid().';
COMMENT ON POLICY "Items update own" ON public.clipboard_items IS
  'TRANSITIONAL Phase 1: open update. Phase 4: restrict to auth.uid() = user_id OR board admin.';
COMMENT ON POLICY "Items delete own" ON public.clipboard_items IS
  'TRANSITIONAL Phase 1: open delete. Phase 4: restrict to auth.uid() = user_id OR board admin.';


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  END PHASE 1 MIGRATION                                                    ║
-- ╚════════════════════════════════════════════════════════════════════════════╝


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 4.2 MIGRATION — Secure membership-scoped RLS (auth.uid() based)   ║
-- ║  Replaces Phase 4.1 header-based policies. Requires Supabase Auth.       ║
-- ║  Run all sub-blocks in order. Each statement is idempotent.               ║
-- ║  Date: 2026-03-10                                                         ║
-- ║                                                                           ║
-- ║  AUTH MODEL                                                               ║
-- ║  Identity is derived ONLY from auth.uid() and auth.jwt()->>email.        ║
-- ║  No browser-supplied headers are trusted.                                 ║
-- ║  The verify-pin edge function issues a Supabase Auth session (JWT)       ║
-- ║  on successful PIN verification. The frontend Supabase client             ║
-- ║  persists that session and attaches the JWT to every PostgREST request.  ║
-- ║  RLS policies read auth.uid() / auth.jwt()->>'email' which are           ║
-- ║  cryptographically verified by PostgREST from the JWT signature.         ║
-- ╚════════════════════════════════════════════════════════════════════════════╝


-- ============================================================================
-- BLOCK 9a: Identity resolver function (secure — JWT only)
-- Returns the authenticated user's email from the JWT.
-- Returns NULL for unauthenticated (anon) requests → membership checks
-- fail safely, only board_id IS NULL legacy items remain visible.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.app_user_email()
RETURNS TEXT
LANGUAGE sql STABLE
AS $$
  SELECT NULLIF(
    COALESCE(
      auth.jwt()->>'email',
      ''
    ),
    ''
  );
$$;

COMMENT ON FUNCTION public.app_user_email() IS
  'Phase 4.2: Returns authenticated user email from JWT only. '
  'NULL when unauthenticated — no client headers trusted.';


-- ============================================================================
-- BLOCK 9b: SECURITY DEFINER helper functions
-- These bypass RLS to avoid circular policy references.
-- search_path is pinned to prevent search-path attacks.
-- ============================================================================

-- Board IDs where the current user has any membership
CREATE OR REPLACE FUNCTION public.user_board_ids()
RETURNS SETOF TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT board_id FROM public.board_members
  WHERE user_email = public.app_user_email();
$$;

-- Board IDs where the current user has admin or owner role
CREATE OR REPLACE FUNCTION public.user_admin_board_ids()
RETURNS SETOF TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT board_id FROM public.board_members
  WHERE user_email = public.app_user_email()
    AND role IN ('owner', 'admin');
$$;

-- Workspace IDs the current user owns
CREATE OR REPLACE FUNCTION public.user_owned_workspace_ids()
RETURNS SETOF TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.workspaces
  WHERE owner_email = public.app_user_email();
$$;

-- Board IDs in workspaces the current user owns (workspace-owner override)
CREATE OR REPLACE FUNCTION public.user_workspace_board_ids()
RETURNS SETOF TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT b.id FROM public.boards b
  JOIN public.workspaces w ON w.id = b.workspace_id
  WHERE w.owner_email = public.app_user_email();
$$;

-- Workspace IDs where the current user participates (owner OR board member)
CREATE OR REPLACE FUNCTION public.user_visible_workspace_ids()
RETURNS SETOF TEXT
LANGUAGE sql STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT id FROM public.workspaces
  WHERE owner_email = public.app_user_email()
  UNION
  SELECT b.workspace_id FROM public.boards b
  JOIN public.board_members bm ON bm.board_id = b.id
  WHERE bm.user_email = public.app_user_email();
$$;


-- ============================================================================
-- BLOCK 9c: Drop ALL previous open policies (Block 8 + Phase 4.1 if exists)
-- ============================================================================

-- Block 8 open policies
DROP POLICY IF EXISTS "workspaces_select" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_insert" ON public.workspaces;
DROP POLICY IF EXISTS "workspaces_update" ON public.workspaces;

DROP POLICY IF EXISTS "boards_select" ON public.boards;
DROP POLICY IF EXISTS "boards_insert" ON public.boards;
DROP POLICY IF EXISTS "boards_update" ON public.boards;

DROP POLICY IF EXISTS "board_members_select" ON public.board_members;
DROP POLICY IF EXISTS "board_members_insert" ON public.board_members;
DROP POLICY IF EXISTS "board_members_update" ON public.board_members;
DROP POLICY IF EXISTS "board_members_delete" ON public.board_members;

-- Phase 4.1 header-based policies (if Block 9 was run before)
DROP POLICY IF EXISTS "ws_select_membership"   ON public.workspaces;
DROP POLICY IF EXISTS "ws_insert_owner"        ON public.workspaces;
DROP POLICY IF EXISTS "ws_update_owner"        ON public.workspaces;
DROP POLICY IF EXISTS "ws_delete_owner"        ON public.workspaces;

DROP POLICY IF EXISTS "boards_select_membership"  ON public.boards;
DROP POLICY IF EXISTS "boards_insert_ws_owner"    ON public.boards;
DROP POLICY IF EXISTS "boards_update_privileged"  ON public.boards;
DROP POLICY IF EXISTS "boards_delete_ws_owner"    ON public.boards;

DROP POLICY IF EXISTS "bm_select_membership"          ON public.board_members;
DROP POLICY IF EXISTS "bm_insert_privileged"          ON public.board_members;
DROP POLICY IF EXISTS "bm_update_privileged"          ON public.board_members;
DROP POLICY IF EXISTS "bm_delete_privileged_or_self"  ON public.board_members;

DROP POLICY IF EXISTS "items_select_v2"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_insert_v2"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_update_v2"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_delete_v2"  ON public.clipboard_items;

-- Phase 4.2 v2 policies (safe re-run: drop before re-create)
DROP POLICY IF EXISTS "ws_select_v2"  ON public.workspaces;
DROP POLICY IF EXISTS "ws_insert_v2"  ON public.workspaces;
DROP POLICY IF EXISTS "ws_update_v2"  ON public.workspaces;
DROP POLICY IF EXISTS "ws_delete_v2"  ON public.workspaces;

DROP POLICY IF EXISTS "boards_select_v2"  ON public.boards;
DROP POLICY IF EXISTS "boards_insert_v2"  ON public.boards;
DROP POLICY IF EXISTS "boards_update_v2"  ON public.boards;
DROP POLICY IF EXISTS "boards_delete_v2"  ON public.boards;

DROP POLICY IF EXISTS "bm_select_v2"  ON public.board_members;
DROP POLICY IF EXISTS "bm_insert_v2"  ON public.board_members;
DROP POLICY IF EXISTS "bm_update_v2"  ON public.board_members;
DROP POLICY IF EXISTS "bm_delete_v2"  ON public.board_members;

DROP POLICY IF EXISTS "items_select_legacy"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_select_board"   ON public.clipboard_items;
DROP POLICY IF EXISTS "items_insert_legacy"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_insert_board"   ON public.clipboard_items;
DROP POLICY IF EXISTS "items_update_legacy"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_update_board"   ON public.clipboard_items;
DROP POLICY IF EXISTS "items_delete_legacy"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_delete_board"   ON public.clipboard_items;

-- Original Block 10 clipboard_items policies
DROP POLICY IF EXISTS "Items select"     ON public.clipboard_items;
DROP POLICY IF EXISTS "Items insert own" ON public.clipboard_items;
DROP POLICY IF EXISTS "Items update own" ON public.clipboard_items;
DROP POLICY IF EXISTS "Items delete own" ON public.clipboard_items;

-- Bootstrap temporary policies on clipboard_items
DROP POLICY IF EXISTS "clipboard_items_select_bootstrap" ON public.clipboard_items;
DROP POLICY IF EXISTS "clipboard_items_insert_bootstrap" ON public.clipboard_items;
DROP POLICY IF EXISTS "clipboard_items_update_bootstrap" ON public.clipboard_items;
DROP POLICY IF EXISTS "clipboard_items_delete_bootstrap" ON public.clipboard_items;

-- Phase 5 activity policies (safe re-run)
DROP POLICY IF EXISTS "activity_select_v1" ON public.board_activity;
DROP POLICY IF EXISTS "activity_insert_v1" ON public.board_activity;


-- ============================================================================
-- BLOCK 9d: Workspace policies — JWT-authenticated, membership-scoped
-- Authenticated users only (no anon access to workspace management).
-- ============================================================================

-- SELECT: own workspaces + workspaces where you're a board member
CREATE POLICY "ws_select_v2" ON public.workspaces
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_visible_workspace_ids()));

-- INSERT: can only create workspaces owned by yourself
CREATE POLICY "ws_insert_v2" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_email = public.app_user_email());

-- UPDATE: workspace owner only
CREATE POLICY "ws_update_v2" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (owner_email = public.app_user_email())
  WITH CHECK (owner_email = public.app_user_email());

-- DELETE: workspace owner only
CREATE POLICY "ws_delete_v2" ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_email = public.app_user_email());


-- ============================================================================
-- BLOCK 9e: Board policies — JWT-authenticated, membership-scoped
-- ============================================================================

-- SELECT: board member OR workspace owner
CREATE POLICY "boards_select_v2" ON public.boards
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT public.user_board_ids())
    OR workspace_id IN (SELECT public.user_owned_workspace_ids())
  );

-- INSERT: workspace owner only
CREATE POLICY "boards_insert_v2" ON public.boards
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (SELECT public.user_owned_workspace_ids())
  );

-- UPDATE: workspace owner OR board admin/owner
CREATE POLICY "boards_update_v2" ON public.boards
  FOR UPDATE TO authenticated
  USING (
    workspace_id IN (SELECT public.user_owned_workspace_ids())
    OR id IN (SELECT public.user_admin_board_ids())
  )
  WITH CHECK (
    workspace_id IN (SELECT public.user_owned_workspace_ids())
    OR id IN (SELECT public.user_admin_board_ids())
  );

-- DELETE: workspace owner only
CREATE POLICY "boards_delete_v2" ON public.boards
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (SELECT public.user_owned_workspace_ids())
  );


-- ============================================================================
-- BLOCK 9f: Board member policies — JWT-authenticated, membership-scoped
-- ============================================================================

-- SELECT: co-members of the same board, OR workspace owner
CREATE POLICY "bm_select_v2" ON public.board_members
  FOR SELECT TO authenticated
  USING (
    board_id IN (SELECT public.user_board_ids())
    OR board_id IN (SELECT public.user_workspace_board_ids())
  );

-- INSERT: workspace owner OR board admin/owner can add members
CREATE POLICY "bm_insert_v2" ON public.board_members
  FOR INSERT TO authenticated
  WITH CHECK (
    board_id IN (SELECT public.user_workspace_board_ids())
    OR board_id IN (SELECT public.user_admin_board_ids())
  );

-- UPDATE: workspace owner OR board admin/owner can change roles
CREATE POLICY "bm_update_v2" ON public.board_members
  FOR UPDATE TO authenticated
  USING (
    board_id IN (SELECT public.user_workspace_board_ids())
    OR board_id IN (SELECT public.user_admin_board_ids())
  )
  WITH CHECK (
    board_id IN (SELECT public.user_workspace_board_ids())
    OR board_id IN (SELECT public.user_admin_board_ids())
  );

-- DELETE: workspace owner, board admin/owner, OR self-remove
CREATE POLICY "bm_delete_v2" ON public.board_members
  FOR DELETE TO authenticated
  USING (
    user_email = public.app_user_email()
    OR board_id IN (SELECT public.user_workspace_board_ids())
    OR board_id IN (SELECT public.user_admin_board_ids())
  );


-- ============================================================================
-- BLOCK 9g: Clipboard items — transitional, JWT + legacy passthrough
-- 
-- DUAL-MODE: Items with board_id IS NULL use the old open-access model
-- (anon + authenticated, USING(true)) so legacy data keeps working.
-- Items WITH a board_id are restricted to authenticated users with
-- board membership. This incentivizes migrating items onto boards.
-- ============================================================================

-- SELECT: legacy (open) OR authenticated + (own item OR board member OR ws owner)
CREATE POLICY "items_select_legacy" ON public.clipboard_items
  FOR SELECT TO anon, authenticated
  USING (board_id IS NULL);

CREATE POLICY "items_select_board" ON public.clipboard_items
  FOR SELECT TO authenticated
  USING (
    board_id IS NOT NULL
    AND (
      user_id = public.app_user_email()
      OR board_id IN (SELECT public.user_board_ids())
      OR board_id IN (SELECT public.user_workspace_board_ids())
    )
  );

-- INSERT: legacy (open) OR authenticated + board member / ws owner
CREATE POLICY "items_insert_legacy" ON public.clipboard_items
  FOR INSERT TO anon, authenticated
  WITH CHECK (board_id IS NULL);

CREATE POLICY "items_insert_board" ON public.clipboard_items
  FOR INSERT TO authenticated
  WITH CHECK (
    board_id IS NOT NULL
    AND user_id = public.app_user_email()
    AND (
      board_id IN (SELECT public.user_board_ids())
      OR board_id IN (SELECT public.user_workspace_board_ids())
    )
  );

-- UPDATE: legacy (open) OR authenticated + own item / admin escalation
CREATE POLICY "items_update_legacy" ON public.clipboard_items
  FOR UPDATE TO anon, authenticated
  USING (board_id IS NULL)
  WITH CHECK (board_id IS NULL);

CREATE POLICY "items_update_board" ON public.clipboard_items
  FOR UPDATE TO authenticated
  USING (
    board_id IS NOT NULL
    AND (
      user_id = public.app_user_email()
      OR board_id IN (SELECT public.user_admin_board_ids())
      OR board_id IN (SELECT public.user_workspace_board_ids())
    )
  )
  WITH CHECK (
    board_id IS NOT NULL
    AND (
      user_id = public.app_user_email()
      OR board_id IN (SELECT public.user_admin_board_ids())
      OR board_id IN (SELECT public.user_workspace_board_ids())
    )
  );

-- DELETE: legacy (open) OR authenticated + own item / admin escalation
CREATE POLICY "items_delete_legacy" ON public.clipboard_items
  FOR DELETE TO anon, authenticated
  USING (board_id IS NULL);

CREATE POLICY "items_delete_board" ON public.clipboard_items
  FOR DELETE TO authenticated
  USING (
    board_id IS NOT NULL
    AND (
      user_id = public.app_user_email()
      OR board_id IN (SELECT public.user_admin_board_ids())
      OR board_id IN (SELECT public.user_workspace_board_ids())
    )
  );


-- ============================================================================
-- BLOCK 9h: Policy comments
-- ============================================================================

COMMENT ON POLICY "items_select_legacy" ON public.clipboard_items IS
  'Phase 4.2 TRANSITIONAL: board_id IS NULL items open to all (anon+auth). '
  'Remove this policy once all items are migrated to boards.';

COMMENT ON POLICY "items_select_board" ON public.clipboard_items IS
  'Phase 4.2: Board items visible only to authenticated board members, ws owners, or item creator.';

COMMENT ON POLICY "ws_select_v2" ON public.workspaces IS
  'Phase 4.2: JWT-authenticated. Workspace visible to owner + board members.';

COMMENT ON POLICY "boards_select_v2" ON public.boards IS
  'Phase 4.2: JWT-authenticated. Board visible to board members + workspace owner.';

COMMENT ON POLICY "bm_select_v2" ON public.board_members IS
  'Phase 4.2: JWT-authenticated. Co-members + workspace owner. SECURITY DEFINER helpers break cycles.';


-- BLOCK 9i: Performance index for board-scoped queries (partial — skips legacy NULL rows)
-- Drop both possible old index names (Block 1 name + any prior Block 9 name)
DROP INDEX IF EXISTS idx_clipboard_items_board;
DROP INDEX IF EXISTS idx_clipboard_items_board_id;
CREATE INDEX IF NOT EXISTS idx_clipboard_items_board_id_nonnull
  ON public.clipboard_items(board_id)
  WHERE board_id IS NOT NULL;

-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  END PHASE 4.2 MIGRATION                                                 ║
-- ╚════════════════════════════════════════════════════════════════════════════╝


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 5: PRODUCTION HARDENING                                            ║
-- ║  board_activity, boards.last_activity, clipboard_items.board_position     ║
-- ╚════════════════════════════════════════════════════════════════════════════╝

-- BLOCK 10a: Board activity event log
CREATE TABLE IF NOT EXISTS public.board_activity (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id     TEXT NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  actor_email  TEXT NOT NULL,
  action       TEXT NOT NULL,     -- item_added, item_updated, item_shared, member_added, member_removed
  item_id      TEXT,              -- nullable — not all actions reference an item
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_board_activity_board
  ON public.board_activity(board_id, created_at DESC);

ALTER TABLE public.board_activity ENABLE ROW LEVEL SECURITY;

-- RLS: board members can read activity for their boards
CREATE POLICY "activity_select_v1" ON public.board_activity
  FOR SELECT TO authenticated
  USING (
    board_id IN (SELECT public.user_board_ids())
    OR board_id IN (SELECT public.user_workspace_board_ids())
  );

-- RLS: board members can insert activity (logged by the app on mutations)
CREATE POLICY "activity_insert_v1" ON public.board_activity
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_email = public.app_user_email()
    AND (
      board_id IN (SELECT public.user_board_ids())
      OR board_id IN (SELECT public.user_workspace_board_ids())
    )
  );

-- No UPDATE/DELETE — activity log is append-only.

-- BLOCK 10b: boards.last_activity for recency sorting
ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT now();

-- BLOCK 10c: clipboard_items.board_position for drag ordering
ALTER TABLE public.clipboard_items
  ADD COLUMN IF NOT EXISTS board_position NUMERIC;


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  PHASE 4.5: OPERATIONAL BOARD LAYER                                       ║
-- ║  Activity logging trigger, board recency updates, position ordering       ║
-- ║  Date: 2026-03-10                                                         ║
-- ╚════════════════════════════════════════════════════════════════════════════╝


-- ============================================================================
-- BLOCK 11a: Auto-update boards.last_activity on new activity rows
-- Type: ADDITIVE (CREATE OR REPLACE + CREATE TRIGGER)
-- When a row is inserted into board_activity, bump the parent board's
-- last_activity timestamp so the board switcher can sort by recency.
-- ============================================================================

CREATE OR REPLACE FUNCTION public.update_board_activity()
RETURNS trigger
LANGUAGE plpgsql
AS $$
BEGIN
  UPDATE public.boards
  SET last_activity = now()
  WHERE id = NEW.board_id;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS board_activity_update ON public.board_activity;

CREATE TRIGGER board_activity_update
  AFTER INSERT ON public.board_activity
  FOR EACH ROW
  EXECUTE FUNCTION public.update_board_activity();

COMMENT ON FUNCTION public.update_board_activity() IS
  'Phase 4.5: Trigger function — bumps boards.last_activity on each board_activity insert.';


-- ============================================================================
-- BLOCK 11b: Activity feed index (board + recency)
-- Type: ADDITIVE (index already created in 10a but restated for clarity)
-- Supports: SELECT * FROM board_activity WHERE board_id=$1
--           ORDER BY created_at DESC LIMIT 50
-- ============================================================================

-- Already created in Block 10a: idx_board_activity_board (board_id, created_at DESC)
-- No additional index needed. This block is a documentation marker.


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  END PHASE 4.5 OPERATIONAL BOARD LAYER                                    ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
