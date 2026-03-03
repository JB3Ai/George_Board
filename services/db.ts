
import { ClipboardItem, ItemType, TaskStatus, UserEmail } from '../types';
import { OWNER_EMAIL } from '../constants';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const STORAGE_KEY = 'jb3_clipboard_data';
const STORAGE_BACKUP_KEY = 'jb3_clipboard_data_backup';
const CLOUD_STATE_TABLE = 'clipboard_state';
const CLOUD_STATE_ID = 'global';

let cloudWriteQueue: Promise<void> = Promise.resolve();

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

const queueCloudWrite = (items: ClipboardItem[]) => {
  if (!isSupabaseConfigured || !supabase) return;

  cloudWriteQueue = cloudWriteQueue
    .catch(() => undefined)
    .then(async () => {
      const { error } = await supabase
        .from(CLOUD_STATE_TABLE)
        .upsert(
          {
            id: CLOUD_STATE_ID,
            payload: items,
            updated_at: new Date().toISOString(),
          },
          { onConflict: 'id' }
        );

      if (error) {
        console.warn('Cloud mirror write failed:', error.message);
      }
    });
};

export const db = {
  getItems: (): ClipboardItem[] => {
    const primary = parseItems(localStorage.getItem(STORAGE_KEY));
    const backup = parseItems(localStorage.getItem(STORAGE_BACKUP_KEY));

    if (primary) {
      if (!backup) {
        localStorage.setItem(STORAGE_BACKUP_KEY, JSON.stringify(primary));
      }
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
    queueCloudWrite(items);
  },

  hydrateFromCloud: async (): Promise<ClipboardItem[] | null> => {
    if (!isSupabaseConfigured || !supabase) return null;

    const { data, error } = await supabase
      .from(CLOUD_STATE_TABLE)
      .select('payload')
      .eq('id', CLOUD_STATE_ID)
      .maybeSingle();

    if (error) {
      console.warn('Cloud hydrate failed:', error.message);
      return null;
    }

    const payload = data?.payload;
    if (!Array.isArray(payload)) return null;

    const items = payload.filter(isValidItem) as ClipboardItem[];
    if (items.length === 0) return [];

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
    return newItem;
  },

  updateItem: (id: string, currentUser: UserEmail, updates: Partial<ClipboardItem>) => {
    const items = db.getItems();
    const item = items.find(i => i.id === id);
    
    if (item && item.userId !== currentUser && currentUser !== OWNER_EMAIL) {
      throw new Error("Unauthorized: You can only edit your own content");
    }

    const updatedItems = items.map(i => i.id === id ? { ...i, ...updates } : i);
    db.saveItems(updatedItems);
  },

  markAsRead: (id: string, readerEmail: UserEmail) => {
    const items = db.getItems();
    const updatedItems = items.map(i => {
      if (i.id === id) {
        const readBy = i.readBy || [];
        if (!readBy.includes(readerEmail)) {
          return { ...i, readBy: [...readBy, readerEmail] };
        }
      }
      return i;
    });
    db.saveItems(updatedItems);
  },

  deleteItem: (id: string, currentUser: UserEmail) => {
    const items = db.getItems();
    const item = items.find(i => i.id === id);
    
    if (item && item.userId !== currentUser && currentUser !== OWNER_EMAIL) {
      throw new Error("Unauthorized");
    }

    const filteredItems = items.filter(i => i.id !== id);
    db.saveItems(filteredItems);
  }
};
