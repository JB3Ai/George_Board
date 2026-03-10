import { isSupabaseConfigured, supabase } from './supabaseClient';

// ── Activity action constants ────────────────────────────────────────────────

export type ActivityAction =
  | 'item_created'
  | 'item_updated'
  | 'item_archived'
  | 'item_deleted'
  | 'item_moved'
  | 'board_created'
  | 'member_added';

// ── Fire-and-forget activity writer ──────────────────────────────────────────

/**
 * Log a board activity event. Never blocks the UI — errors are silently
 * swallowed so mutations are never gated on activity writes.
 */
export function logBoardActivity(
  boardId: string | null | undefined,
  actorEmail: string,
  action: ActivityAction,
  itemId?: string,
): void {
  if (!boardId || !actorEmail || !isSupabaseConfigured || !supabase) return;

  (supabase as any)
    .from('board_activity')
    .insert({
      board_id: boardId,
      actor_email: actorEmail,
      action,
      item_id: itemId ?? null,
    })
    .then(({ error }: { error: any }) => {
      if (error) console.warn('Activity log failed:', error.message);
    });
}

// ── Activity feed reader ─────────────────────────────────────────────────────

export interface BoardActivityRow {
  id: string;
  boardId: string;
  actorEmail: string;
  action: ActivityAction;
  itemId: string | null;
  createdAt: string;
}

/**
 * Load the most recent activity entries for a board.
 */
export async function loadBoardActivity(
  boardId: string,
  limit = 50,
): Promise<BoardActivityRow[]> {
  if (!isSupabaseConfigured || !supabase) return [];

  const { data, error } = await (supabase as any)
    .from('board_activity')
    .select('*')
    .eq('board_id', boardId)
    .order('created_at', { ascending: false })
    .limit(limit);

  if (error || !Array.isArray(data)) return [];

  return data.map((row: any) => ({
    id: row.id,
    boardId: row.board_id,
    actorEmail: row.actor_email,
    action: row.action as ActivityAction,
    itemId: row.item_id ?? null,
    createdAt: row.created_at,
  }));
}
