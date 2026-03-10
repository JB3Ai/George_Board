import { isSupabaseConfigured, supabase } from './supabaseClient';

// ── Types ────────────────────────────────────────────────────────────────────

export interface Workspace {
  id: string;
  name: string;
  ownerEmail: string;
  createdAt: string;
  updatedAt: string;
}

export interface Board {
  id: string;
  workspaceId: string;
  name: string;
  description?: string;
  lastActivity?: string;
  createdAt: string;
  updatedAt: string;
}

export interface BoardMember {
  boardId: string;
  userEmail: string;
  role: 'owner' | 'admin' | 'member' | 'viewer';
  joinedAt: string;
}

// ── Row mappers ──────────────────────────────────────────────────────────────

const workspaceFromRow = (row: any): Workspace => ({
  id: row.id,
  name: row.name,
  ownerEmail: row.owner_email,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const boardFromRow = (row: any): Board => ({
  id: row.id,
  workspaceId: row.workspace_id,
  name: row.name,
  description: row.description ?? undefined,
  lastActivity: row.last_activity ?? undefined,
  createdAt: row.created_at,
  updatedAt: row.updated_at,
});

const memberFromRow = (row: any): BoardMember => ({
  boardId: row.board_id,
  userEmail: row.user_email,
  role: row.role,
  joinedAt: row.joined_at,
});

// ── Queries ──────────────────────────────────────────────────────────────────

/** Load workspaces owned by this email (owner view). */
export async function loadWorkspacesForOwner(ownerEmail: string): Promise<Workspace[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await (supabase as any)
    .from('workspaces')
    .select('*')
    .eq('owner_email', ownerEmail)
    .order('created_at', { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data.map(workspaceFromRow);
}

/** Load boards for a workspace (sorted by most recent activity). */
export async function loadBoardsForWorkspace(workspaceId: string): Promise<Board[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await (supabase as any)
    .from('boards')
    .select('*')
    .eq('workspace_id', workspaceId)
    .order('last_activity', { ascending: false, nullsFirst: false });
  if (error || !Array.isArray(data)) return [];
  return data.map(boardFromRow);
}

/** Load boards the user is a member of (non-owner view). */
export async function loadBoardsForUser(userEmail: string): Promise<Board[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await (supabase as any)
    .from('board_members')
    .select('board_id, boards(*)')
    .eq('user_email', userEmail);
  if (error || !Array.isArray(data)) return [];
  return data
    .filter((row: any) => row.boards)
    .map((row: any) => boardFromRow(row.boards));
}

/** Load members for a single board. */
export async function loadMembersForBoard(boardId: string): Promise<BoardMember[]> {
  if (!isSupabaseConfigured || !supabase) return [];
  const { data, error } = await (supabase as any)
    .from('board_members')
    .select('*')
    .eq('board_id', boardId)
    .order('joined_at', { ascending: true });
  if (error || !Array.isArray(data)) return [];
  return data.map(memberFromRow);
}

// ── Mutations ────────────────────────────────────────────────────────────────

/** Create a workspace. Returns the created workspace or null on failure. */
export async function createWorkspace(name: string, ownerEmail: string): Promise<Workspace | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { data, error } = await (supabase as any)
    .from('workspaces')
    .insert({ id, name, owner_email: ownerEmail, created_at: now, updated_at: now })
    .select()
    .single();
  if (error || !data) return null;
  return workspaceFromRow(data);
}

/** Create a board within a workspace. Returns the created board or null. */
export async function createBoard(workspaceId: string, name: string, description?: string): Promise<Board | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  const { data, error } = await (supabase as any)
    .from('boards')
    .insert({ id, workspace_id: workspaceId, name, description: description ?? null, created_at: now, updated_at: now })
    .select()
    .single();
  if (error || !data) return null;
  return boardFromRow(data);
}

/** Add a member to a board. */
export async function addBoardMember(boardId: string, userEmail: string, role: string = 'member'): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { error } = await (supabase as any)
    .from('board_members')
    .upsert({ board_id: boardId, user_email: userEmail, role, joined_at: new Date().toISOString() }, { onConflict: 'board_id,user_email' });
  return !error;
}

/** Remove a member from a board. */
export async function removeBoardMember(boardId: string, userEmail: string): Promise<boolean> {
  if (!isSupabaseConfigured || !supabase) return false;
  const { error } = await (supabase as any)
    .from('board_members')
    .delete()
    .eq('board_id', boardId)
    .eq('user_email', userEmail);
  return !error;
}
