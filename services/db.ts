
import { ClipboardItem, ItemType, TaskStatus, UserEmail } from '../types';
import { OWNER_EMAIL } from '../constants';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const STORAGE_KEY = 'jb3_clipboard_data';
const STORAGE_BACKUP_KEY = 'jb3_clipboard_data_backup';
const ITEMS_TABLE = 'clipboard_items';

const isValidItem = (item: any): item is ClipboardItem => {
  return Boolean(
    item &&
    typeof item.id === 'string' &&
    typeof item.userId === 'string' &&
    typeof item.type === 'string' &&
    typeof item.title === 'string' &&
    typeof item.content === 'string' &&
    typeof item.createdAt === 'number'
  );
};

const parseItems = (raw: string | null): ClipboardItem[] | null => {
  if (!raw) return null;
  try {
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return null;
    return parsed.filter(isValidItem);
  } catch {
    return null;
  }
};

// Map ClipboardItem (camelCase) → Supabase row (snake_case)
const toRow = (item: ClipboardItem) => ({
  id: item.id,
  user_id: item.userId,
  sync_tab_id: item.syncTabId ?? null,
  type: item.type,
  title: item.title,
  content: item.content,
  is_pinned: item.isPinned,
  is_archived: item.isArchived,
  created_at: item.createdAt,
  task_status: item.taskStatus ?? null,
  due_date: item.dueDate ?? null,
  event_location: item.eventLocation ?? null,
  enrichment_status: item.enrichmentStatus ?? null,
  link_metadata: item.metadata ?? null,
  read_by: item.readBy ?? [],
  file_url: item.fileUrl ?? null,
  file_name: item.fileName ?? null,
  file_size: item.fileSize ?? null,
  shared_group_id: item.sharedGroupId ?? null,
  updated_at: new Date().toISOString(),
});

// Map Supabase row → ClipboardItem
const fromRow = (row: any): ClipboardItem => ({
  id: row.id,
  userId: row.user_id,
  syncTabId: row.sync_tab_id ?? undefined,
  type: row.type as ItemType,
  title: row.title,
  content: row.content,
  isPinned: row.is_pinned ?? false,
  isArchived: row.is_archived ?? false,
  createdAt: row.created_at,
  taskStatus: row.task_status ?? undefined,
  dueDate: row.due_date ?? undefined,
  eventLocation: row.event_location ?? undefined,
  enrichmentStatus: row.enrichment_status ?? undefined,
  metadata: row.link_metadata ?? undefined,
  readBy: row.read_by ?? [],
  fileUrl: row.file_url ?? undefined,
  fileName: row.file_name ?? undefined,
  fileSize: row.file_size ?? undefined,
  sharedGroupId: row.shared_group_id ?? undefined,
});

const writeToSupabase = (item: ClipboardItem) => {
  if (!isSupabaseConfigured || !supabase) return;
  (supabase as any)
    .from(ITEMS_TABLE)
    .upsert(toRow(item), { onConflict: 'id' })
    .then(({ error }: { error: any }) => {
      if (error) console.warn('Supabase item write failed:', error.message);
    });
};

const writeMultipleToSupabase = (items: ClipboardItem[]) => {
  if (!isSupabaseConfigured || !supabase || items.length === 0) return;
  (supabase as any)
    .from(ITEMS_TABLE)
    .upsert(items.map(toRow), { onConflict: 'id' })
    .then(({ error }: { error: any }) => {
      if (error) console.warn('Supabase batch write failed:', error.message);
    });
};

const deleteFromSupabase = (id: string) => {
  if (!isSupabaseConfigured || !supabase) return;
  (supabase as any)
    .from(ITEMS_TABLE)
    .delete()
    .eq('id', id)
    .then(({ error }: { error: any }) => {
      if (error) console.warn('Supabase item delete failed:', error.message);
    });
};

export const db = {
  getItems: (): ClipboardItem[] => {
    const primary = parseItems(localStorage.getItem(STORAGE_KEY));
    const backup = parseItems(localStorage.getItem(STORAGE_BACKUP_KEY));

    if (primary) {
      if (!backup) localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(primary));
      return primary;
    }

    if (backup) {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(backup));
      return backup;
    }

    return [];
  },

  saveItems: (items: ClipboardItem[]) => {
    const serialized = JSON.stringify(items);
    localStorage.setItem(STORAGE_KEY, serialized);
    localStorage.setItem(STORAGE_BACKUP_KEY, serialized);
  },

  hydrateFromCloud: async (): Promise<ClipboardItem[] | null> => {
    if (!isSupabaseConfigured || !supabase) return null;

    const { data, error } = await (supabase as any)
      .from(ITEMS_TABLE)
      .select('*')
      .order('created_at', { ascending: false });

    if (error) {
      console.warn('Cloud hydrate failed:', error.message);
      return null;
    }

    if (!Array.isArray(data) || data.length === 0) return [];

    const items = data.map(fromRow);
    db.saveItems(items);
    return items;
  },

  addItem: (item: Omit<ClipboardItem, 'id' | 'createdAt' | 'isPinned' | 'isArchived'>): ClipboardItem => {
    const newItem: ClipboardItem = {
      ...item,
      id: crypto.randomUUID(),
      createdAt: Date.now(),
      isPinned: false,
      isArchived: false,
      readBy: [],
    };
    const items = db.getItems();
    db.saveItems([newItem, ...items]);
    writeToSupabase(newItem);
    return newItem;
  },

  addItemBatch: (
    base: Omit<ClipboardItem, 'id' | 'createdAt' | 'isPinned' | 'isArchived' | 'syncTabId' | 'sharedGroupId'>,
    targetSyncTabIds: string[]
  ): ClipboardItem[] => {
    const groupId = crypto.randomUUID();
    const now = Date.now();
    const existing = db.getItems();
    const created: ClipboardItem[] = targetSyncTabIds.map(tabId => ({
      ...base,
      id: crypto.randomUUID(),
      syncTabId: tabId,
      sharedGroupId: groupId,
      createdAt: now,
      isPinned: false,
      isArchived: false,
      readBy: [],
    }));
    db.saveItems([...created, ...existing]);
    writeMultipleToSupabase(created);
    return created;
  },

  updateItem: (id: string, currentUser: UserEmail, updates: Partial<ClipboardItem>) => {
    const items = db.getItems();
    const item = items.find(i => i.id === id);

    if (item && item.userId !== currentUser && currentUser !== OWNER_EMAIL) {
      throw new Error('Unauthorized: You can only edit your own content');
    }

    const updatedItem = item ? { ...item, ...updates } : null;
    const updatedItems = items.map(i => i.id === id ? { ...i, ...updates } : i);
    db.saveItems(updatedItems);
    if (updatedItem) writeToSupabase(updatedItem);
  },

  markAsRead: (id: string, readerEmail: UserEmail) => {
    const items = db.getItems();
    let updated: ClipboardItem | null = null;
    const updatedItems = items.map(i => {
      if (i.id === id) {
        const readBy = i.readBy || [];
        if (!readBy.includes(readerEmail)) {
          updated = { ...i, readBy: [...readBy, readerEmail] };
          return updated;
        }
      }
      return i;
    });
    db.saveItems(updatedItems);
    if (updated) writeToSupabase(updated);
  },

  deleteItem: (id: string, currentUser: UserEmail) => {
    const items = db.getItems();
    const item = items.find(i => i.id === id);

    if (item && item.userId !== currentUser && currentUser !== OWNER_EMAIL) {
      throw new Error('Unauthorized');
    }

    db.saveItems(items.filter(i => i.id !== id));
    deleteFromSupabase(id);
  }
};

const NOTE_STATE_KEY = 'default_note';

export async function saveDefaultNoteToCloud(note: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await (supabase as any)
      .from('clipboard_state')
      .upsert({ id: NOTE_STATE_KEY, payload: { text: note }, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Default note cloud save failed:', err);
  }
}

export async function loadDefaultNote(): Promise<string | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data } = await (supabase as any)
      .from('clipboard_state')
      .select('payload')
      .eq('id', NOTE_STATE_KEY)
      .maybeSingle();
    const text = (data as any)?.payload?.text;
    return typeof text === 'string' ? text : null;
  } catch {
    return null;
  }
}

// ─── User Presence Heartbeat ──────────────────────────────────────────
const PRESENCE_PREFIX = 'presence_';

export async function sendPresenceHeartbeat(email: string): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    await (supabase as any)
      .from('clipboard_state')
      .upsert({ id: `${PRESENCE_PREFIX}${email}`, payload: { timestamp: Date.now() }, updated_at: new Date().toISOString() }, { onConflict: 'id' });
  } catch (err) {
    console.warn('Presence heartbeat failed:', err);
  }
}

export async function getUserPresence(email: string): Promise<{ timestamp: number } | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const { data } = await (supabase as any)
      .from('clipboard_state')
      .select('payload')
      .eq('id', `${PRESENCE_PREFIX}${email}`)
      .maybeSingle();
    const ts = (data as any)?.payload?.timestamp;
    return typeof ts === 'number' ? { timestamp: ts } : null;
  } catch {
    return null;
  }
}
