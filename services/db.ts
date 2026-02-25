
import { ClipboardItem, ItemType, TaskStatus, UserEmail } from '../types';

const STORAGE_KEY = 'jb3_clipboard_data';

export const db = {
  getItems: (): ClipboardItem[] => {
    const data = localStorage.getItem(STORAGE_KEY);
    return data ? JSON.parse(data) : [];
  },

  saveItems: (items: ClipboardItem[]) => {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
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
    
    // Simulate Row Level Security
    if (item && item.userId !== currentUser) {
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
    
    if (item && item.userId !== currentUser) {
      throw new Error("Unauthorized");
    }

    const filteredItems = items.filter(i => i.id !== id);
    db.saveItems(filteredItems);
  }
};
