-- ╔════════════════════════════════════════════════════════════════════════════╗
-- ║  DEPLOYMENT: Phase 4.2 + Phase 5                                         ║
-- ║  George_Board — OS³ Clipboard                                             ║
-- ║  Target: Supabase SQL Editor (run as postgres / service role)             ║
-- ║  Date: 2026-03-10                                                         ║
-- ║                                                                           ║
-- ║  PREREQUISITES:                                                           ║
-- ║  - Blocks 1–8 (Phase 1) MUST already be executed.                         ║
-- ║    Tables required: workspaces, boards, board_members, clipboard_items,   ║
-- ║    profiles, metadata_cache, user_profiles, user_registry.                ║
-- ║  - clipboard_items.board_id column must exist (Block 1).                  ║
-- ║  - FK fk_clipboard_items_board must exist (Block 6b).                     ║
-- ║                                                                           ║
-- ║  EXECUTION:                                                               ║
-- ║  Run all blocks IN ORDER in one Supabase SQL Editor session.              ║
-- ║  Each block is safe to re-run (idempotent).                               ║
-- ║                                                                           ║
-- ║  AUTH MODEL:                                                              ║
-- ║  Identity is derived ONLY from auth.jwt()->>email.                       ║
-- ║  No browser-supplied headers are trusted.                                 ║
-- ║  The verify-pin edge function issues a Supabase Auth session (JWT)       ║
-- ║  on successful PIN verification.                                          ║
-- ╚════════════════════════════════════════════════════════════════════════════╝


-- ============================================================================
-- BLOCK 9a: Identity resolver function (JWT only)
-- Type: ADDITIVE (CREATE OR REPLACE)
-- Returns the authenticated user's email from the JWT.
-- Returns NULL for unauthenticated (anon) requests.
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
  'NULL when unauthenticated. No client headers trusted.';


-- ============================================================================
-- BLOCK 9b: SECURITY DEFINER helper functions
-- Type: ADDITIVE (CREATE OR REPLACE)
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
-- BLOCK 9c: Drop ALL previous open/header-based policies
-- Type: DESTRUCTIVE (policy drops)
-- Drops: Block 8 open policies, Phase 4.1 header-based policies (if any),
--         and original clipboard_items open policies.
-- Safe: DROP IF EXISTS — no errors if policies don't exist.
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

-- Phase 4.1 header-based policies (cleanup — these should not exist)
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

DROP POLICY IF EXISTS "items_select_v2"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_insert_v2"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_update_v2"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_delete_v2"  ON public.clipboard_items;

DROP POLICY IF EXISTS "items_select_legacy"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_select_board"   ON public.clipboard_items;
DROP POLICY IF EXISTS "items_insert_legacy"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_insert_board"   ON public.clipboard_items;
DROP POLICY IF EXISTS "items_update_legacy"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_update_board"   ON public.clipboard_items;
DROP POLICY IF EXISTS "items_delete_legacy"  ON public.clipboard_items;
DROP POLICY IF EXISTS "items_delete_board"   ON public.clipboard_items;

-- Original Pre-Phase open policies on clipboard_items
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
-- BLOCK 9d: Workspace policies (JWT-authenticated, membership-scoped)
-- Type: ADDITIVE (CREATE POLICY)
-- Authenticated users only. No anon access to workspace management.
-- ============================================================================

CREATE POLICY "ws_select_v2" ON public.workspaces
  FOR SELECT TO authenticated
  USING (id IN (SELECT public.user_visible_workspace_ids()));

CREATE POLICY "ws_insert_v2" ON public.workspaces
  FOR INSERT TO authenticated
  WITH CHECK (owner_email = public.app_user_email());

CREATE POLICY "ws_update_v2" ON public.workspaces
  FOR UPDATE TO authenticated
  USING (owner_email = public.app_user_email())
  WITH CHECK (owner_email = public.app_user_email());

CREATE POLICY "ws_delete_v2" ON public.workspaces
  FOR DELETE TO authenticated
  USING (owner_email = public.app_user_email());


-- ============================================================================
-- BLOCK 9e: Board policies (JWT-authenticated, membership-scoped)
-- Type: ADDITIVE (CREATE POLICY)
-- ============================================================================

CREATE POLICY "boards_select_v2" ON public.boards
  FOR SELECT TO authenticated
  USING (
    id IN (SELECT public.user_board_ids())
    OR workspace_id IN (SELECT public.user_owned_workspace_ids())
  );

CREATE POLICY "boards_insert_v2" ON public.boards
  FOR INSERT TO authenticated
  WITH CHECK (
    workspace_id IN (SELECT public.user_owned_workspace_ids())
  );

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

CREATE POLICY "boards_delete_v2" ON public.boards
  FOR DELETE TO authenticated
  USING (
    workspace_id IN (SELECT public.user_owned_workspace_ids())
  );


-- ============================================================================
-- BLOCK 9f: Board member policies (JWT-authenticated, membership-scoped)
-- Type: ADDITIVE (CREATE POLICY)
-- ============================================================================

CREATE POLICY "bm_select_v2" ON public.board_members
  FOR SELECT TO authenticated
  USING (
    board_id IN (SELECT public.user_board_ids())
    OR board_id IN (SELECT public.user_workspace_board_ids())
  );

CREATE POLICY "bm_insert_v2" ON public.board_members
  FOR INSERT TO authenticated
  WITH CHECK (
    board_id IN (SELECT public.user_workspace_board_ids())
    OR board_id IN (SELECT public.user_admin_board_ids())
  );

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

CREATE POLICY "bm_delete_v2" ON public.board_members
  FOR DELETE TO authenticated
  USING (
    user_email = public.app_user_email()
    OR board_id IN (SELECT public.user_workspace_board_ids())
    OR board_id IN (SELECT public.user_admin_board_ids())
  );


-- ============================================================================
-- BLOCK 9g: Clipboard items — DUAL-MODE (JWT + legacy passthrough)
-- Type: ADDITIVE (CREATE POLICY)
--
-- Items with board_id IS NULL use the old open-access model
-- (anon + authenticated, USING(true)) so legacy data keeps working.
-- Items WITH a board_id require authentication + board membership.
-- ============================================================================

-- SELECT: legacy open OR authenticated board member
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

-- INSERT: legacy open OR authenticated board member
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

-- UPDATE: legacy open OR authenticated own item / admin
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

-- DELETE: legacy open OR authenticated own item / admin
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
-- BLOCK 9h: Policy and function comments
-- Type: ADDITIVE (COMMENT ON)
-- ============================================================================

COMMENT ON POLICY "items_select_legacy" ON public.clipboard_items IS
  'Phase 4.2 TRANSITIONAL: board_id IS NULL items open to all (anon+auth). '
  'Remove once all items are migrated to boards.';

COMMENT ON POLICY "items_select_board" ON public.clipboard_items IS
  'Phase 4.2: Board items visible to authenticated board members, ws owners, or item creator.';

COMMENT ON POLICY "ws_select_v2" ON public.workspaces IS
  'Phase 4.2: JWT-authenticated. Workspace visible to owner + board members.';

COMMENT ON POLICY "boards_select_v2" ON public.boards IS
  'Phase 4.2: JWT-authenticated. Board visible to board members + workspace owner.';

COMMENT ON POLICY "bm_select_v2" ON public.board_members IS
  'Phase 4.2: JWT-authenticated. Co-members + workspace owner. SECURITY DEFINER helpers break cycles.';


-- ============================================================================
-- BLOCK 9i: Performance index (replaces Block 1 index)
-- Type: DESTRUCTIVE (index drop + re-create with better name)
-- Drops both possible old index names, creates one canonical partial index.
-- ============================================================================

DROP INDEX IF EXISTS idx_clipboard_items_board;
DROP INDEX IF EXISTS idx_clipboard_items_board_id;
CREATE INDEX IF NOT EXISTS idx_clipboard_items_board_id_nonnull
  ON public.clipboard_items(board_id)
  WHERE board_id IS NOT NULL;


-- ============================================================================
-- BLOCK 10a: Board activity event log
-- Type: ADDITIVE (new table + indexes + RLS)
-- Append-only log. No UPDATE or DELETE policies.
-- ============================================================================

CREATE TABLE IF NOT EXISTS public.board_activity (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  board_id     TEXT NOT NULL REFERENCES public.boards(id) ON DELETE CASCADE,
  actor_email  TEXT NOT NULL,
  action       TEXT NOT NULL,
  item_id      TEXT,
  created_at   TIMESTAMP WITH TIME ZONE DEFAULT now() NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_board_activity_board
  ON public.board_activity(board_id, created_at DESC);

ALTER TABLE public.board_activity ENABLE ROW LEVEL SECURITY;

CREATE POLICY "activity_select_v1" ON public.board_activity
  FOR SELECT TO authenticated
  USING (
    board_id IN (SELECT public.user_board_ids())
    OR board_id IN (SELECT public.user_workspace_board_ids())
  );

CREATE POLICY "activity_insert_v1" ON public.board_activity
  FOR INSERT TO authenticated
  WITH CHECK (
    actor_email = public.app_user_email()
    AND (
      board_id IN (SELECT public.user_board_ids())
      OR board_id IN (SELECT public.user_workspace_board_ids())
    )
  );

-- No UPDATE or DELETE policies. Activity log is append-only.


-- ============================================================================
-- BLOCK 10b: boards.last_activity column
-- Type: ADDITIVE (ALTER TABLE ADD COLUMN IF NOT EXISTS)
-- ============================================================================

ALTER TABLE public.boards
  ADD COLUMN IF NOT EXISTS last_activity TIMESTAMP WITH TIME ZONE DEFAULT now();


-- ============================================================================
-- BLOCK 10c: clipboard_items.board_position column
-- Type: ADDITIVE (ALTER TABLE ADD COLUMN IF NOT EXISTS)
-- ============================================================================

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
-- VERIFICATION QUERIES (run after deployment to confirm)
-- ============================================================================

-- 1. Confirm function exists
SELECT proname, prosecdef FROM pg_proc WHERE proname = 'app_user_email';

-- 2. Confirm all 6 helper functions exist
SELECT proname, prosecdef
FROM pg_proc
WHERE proname IN (
  'app_user_email',
  'user_board_ids',
  'user_admin_board_ids',
  'user_owned_workspace_ids',
  'user_workspace_board_ids',
  'user_visible_workspace_ids'
)
ORDER BY proname;

-- 3. Confirm no old open policies remain on clipboard_items
SELECT policyname FROM pg_policies
WHERE tablename = 'clipboard_items'
ORDER BY policyname;
-- Expected: items_delete_board, items_delete_legacy, items_insert_board,
--           items_insert_legacy, items_select_board, items_select_legacy,
--           items_update_board, items_update_legacy

-- 4. Confirm workspace/board/board_member policies are v2 only
SELECT tablename, policyname FROM pg_policies
WHERE tablename IN ('workspaces', 'boards', 'board_members')
ORDER BY tablename, policyname;
-- Expected: all _v2 names. No old open policies or _v1 names.

-- 5. Confirm partial index exists
SELECT indexname, indexdef FROM pg_indexes
WHERE tablename = 'clipboard_items' AND indexname LIKE '%board%';
-- Expected: idx_clipboard_items_board_id_nonnull only (no duplicates)

-- 6. Confirm board_activity table
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'board_activity' ORDER BY ordinal_position;

-- 7. Confirm new columns
SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'boards' AND column_name = 'last_activity';

SELECT column_name, data_type FROM information_schema.columns
WHERE table_name = 'clipboard_items' AND column_name = 'board_position';

-- 8. Legacy compatibility: anon can still SELECT items with NULL board_id
-- Run this from a non-authenticated client (anon key only):
--   SELECT count(*) FROM clipboard_items WHERE board_id IS NULL;
-- Should return the count of all legacy items.

-- 9. Confirm update_board_activity trigger function exists
SELECT proname FROM pg_proc WHERE proname = 'update_board_activity';

-- 10. Confirm trigger is attached to board_activity
SELECT tgname, tgtype FROM pg_trigger
WHERE tgrelid = 'public.board_activity'::regclass
  AND tgname = 'board_activity_update';
