-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  BOOTSTRAP: Create all missing tables for George_Board Clipboard          ║
-- ║  Target: Supabase SQL Editor (run as postgres / service role)             ║
-- ║  Date: 2026-03-10                                                         ║
-- ║                                                                           ║
-- ║  SAFE: Uses CREATE TABLE IF NOT EXISTS. Does not drop anything.           ║
-- ║  SCOPE: Creates tables + columns + minimal indexes + RLS enabled.         ║
-- ║  POLICIES: Temporary open (anon+auth) for tables the frontend needs now.  ║
-- ║            No JWT policies — those come from DEPLOY_PHASE4_5.sql later.   ║
-- ║                                                                           ║
-- ║  EXISTING: request_logs is left untouched.                                ║
-- ║  NEXT: After this succeeds, run DEPLOY_PHASE4_5.sql (Blocks 9a–10c).     ║
-- ╚════════════════════════════════════════════════════════════════════════════╝


-- ============================================================================
-- 1. metadata_cache (used by fetch-metadata edge function + frontend cache)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.metadata_cache (
  url_hash    TEXT PRIMARY KEY,
  url         TEXT NOT NULL,
  data        JSONB NOT NULL,
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_metadata_expiry
  ON public.metadata_cache(created_at);

ALTER TABLE public.metadata_cache ENABLE ROW LEVEL SECURITY;

-- Client can read cache; only edge function (service role) writes
CREATE POLICY "cache_select_public" ON public.metadata_cache
  FOR SELECT TO anon, authenticated
  USING (true);


-- ============================================================================
-- 2. user_profiles (legacy — frontend reads theme/font_size from here)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_profiles (
  email       TEXT PRIMARY KEY,
  pin         TEXT,
  theme       TEXT DEFAULT 'NEON',
  font_size   TEXT DEFAULT 'SMALL',
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Profiles open access" ON public.user_profiles
  FOR ALL TO anon, authenticated
  USING (true)
  WITH CHECK (true);


-- ============================================================================
-- 3. profiles (secure — service-role only, used by edge functions)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.profiles (
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


-- ============================================================================
-- 4. clipboard_items (main item table — all columns including Phase 1 adds)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.clipboard_items (
  id                      TEXT PRIMARY KEY,
  user_id                 TEXT NOT NULL,
  sync_tab_id             TEXT,
  type                    TEXT NOT NULL,
  title                   TEXT NOT NULL,
  content                 TEXT NOT NULL,
  is_pinned               BOOLEAN DEFAULT false,
  is_archived             BOOLEAN DEFAULT false,
  created_at              BIGINT NOT NULL,
  task_status             TEXT,
  due_date                TEXT,
  event_location          TEXT,
  enrichment_status       TEXT,
  link_metadata           JSONB,
  read_by                 TEXT[] DEFAULT '{}',
  shared_group_id         TEXT,
  file_url                TEXT,
  file_name               TEXT,
  file_size               BIGINT,
  preview_fail_count      INTEGER DEFAULT 0,
  preview_last_fetched_at BIGINT,
  preview_next_allowed_at BIGINT,
  project_id              TEXT,
  board_id                TEXT,
  updated_at              TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.clipboard_items ENABLE ROW LEVEL SECURITY;

-- Temporary open policies — Block 9c (DEPLOY_PHASE4_5.sql) will drop these
-- and replace with JWT dual-mode policies.
CREATE POLICY "Items select" ON public.clipboard_items
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Items insert own" ON public.clipboard_items
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Items update own" ON public.clipboard_items
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Items delete own" ON public.clipboard_items
  FOR DELETE TO anon, authenticated USING (true);

-- Minimum indexes
CREATE INDEX IF NOT EXISTS idx_clipboard_items_user
  ON public.clipboard_items(user_id);

CREATE INDEX IF NOT EXISTS idx_clipboard_items_created
  ON public.clipboard_items(created_at DESC);


-- ============================================================================
-- 5. user_registry (team member list)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.user_registry (
  id        TEXT PRIMARY KEY,
  label     TEXT NOT NULL,
  email     TEXT NOT NULL UNIQUE,
  is_owner  BOOLEAN DEFAULT false,
  added_at  BIGINT DEFAULT 0,
  added_by  TEXT
);

ALTER TABLE public.user_registry ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Registry select" ON public.user_registry
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "Registry insert" ON public.user_registry
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "Registry update" ON public.user_registry
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "Registry delete" ON public.user_registry
  FOR DELETE TO anon, authenticated USING (true);


-- ============================================================================
-- 6. workspaces (Phase 4 structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.workspaces (
  id          TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  name        TEXT NOT NULL,
  owner_email TEXT NOT NULL REFERENCES public.profiles(email),
  created_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at  TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.workspaces ENABLE ROW LEVEL SECURITY;

-- Temporary open policies — Block 9c will drop and replace
CREATE POLICY "workspaces_select" ON public.workspaces
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "workspaces_insert" ON public.workspaces
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "workspaces_update" ON public.workspaces
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);


-- ============================================================================
-- 7. boards (Phase 4 structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.boards (
  id            TEXT PRIMARY KEY DEFAULT gen_random_uuid()::text,
  workspace_id  TEXT NOT NULL REFERENCES public.workspaces(id) ON DELETE CASCADE,
  name          TEXT NOT NULL,
  description   TEXT,
  created_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  updated_at    TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_boards_workspace
  ON public.boards(workspace_id);

ALTER TABLE public.boards ENABLE ROW LEVEL SECURITY;

-- Temporary open policies — Block 9c will drop and replace
CREATE POLICY "boards_select" ON public.boards
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "boards_insert" ON public.boards
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "boards_update" ON public.boards
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);


-- ============================================================================
-- 8. board_members (Phase 4 structure)
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.board_members (
  board_id    TEXT NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  user_email  TEXT NOT NULL REFERENCES public.profiles(email),
  role        TEXT NOT NULL DEFAULT 'member',
  joined_at   TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
  PRIMARY KEY (board_id, user_email)
);

CREATE INDEX IF NOT EXISTS idx_board_members_user
  ON public.board_members(user_email);

ALTER TABLE public.board_members ENABLE ROW LEVEL SECURITY;

-- Temporary open policies — Block 9c will drop and replace
CREATE POLICY "board_members_select" ON public.board_members
  FOR SELECT TO anon, authenticated USING (true);

CREATE POLICY "board_members_insert" ON public.board_members
  FOR INSERT TO anon, authenticated WITH CHECK (true);

CREATE POLICY "board_members_update" ON public.board_members
  FOR UPDATE TO anon, authenticated USING (true) WITH CHECK (true);

CREATE POLICY "board_members_delete" ON public.board_members
  FOR DELETE TO anon, authenticated USING (true);


-- ============================================================================
-- 9. clipboard_items.board_id FK → boards(id)
-- ON DELETE SET NULL: if a board is deleted, items become unassigned.
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
-- 10. Storage buckets for documents and media
-- ============================================================================

INSERT INTO storage.buckets (id, name, public)
VALUES ('documents', 'documents', true)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('media', 'media', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies (IF NOT EXISTS not supported — use DO blocks)
DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Documents public read' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Documents public read" ON storage.objects
      FOR SELECT TO anon, authenticated USING (bucket_id = 'documents');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Documents upload' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Documents upload" ON storage.objects
      FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'documents');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Documents delete own' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Documents delete own" ON storage.objects
      FOR DELETE TO anon, authenticated USING (bucket_id = 'documents');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Media public read' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Media public read" ON storage.objects
      FOR SELECT TO anon, authenticated USING (bucket_id = 'media');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Media upload' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Media upload" ON storage.objects
      FOR INSERT TO anon, authenticated WITH CHECK (bucket_id = 'media');
  END IF;
END $$;

DO $$ BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE policyname = 'Media delete own' AND tablename = 'objects'
  ) THEN
    CREATE POLICY "Media delete own" ON storage.objects
      FOR DELETE TO anon, authenticated USING (bucket_id = 'media');
  END IF;
END $$;


-- ============================================================================
-- 11. Seed owner profile (safe — ON CONFLICT skips if already exists)
-- ============================================================================

INSERT INTO public.profiles (email, is_super_admin, created_at, updated_at)
VALUES ('jono@jonoblackburn.com', true, now(), now())
ON CONFLICT (email) DO NOTHING;


-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  END BOOTSTRAP                                                            ║
-- ╚════════════════════════════════════════════════════════════════════════════╝
