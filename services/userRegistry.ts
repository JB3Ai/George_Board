import { UserEmail } from '../types';

export interface RegisteredUser {
  id: string;
  label: string;
  email: UserEmail;
  isOwner?: boolean;
  addedAt: number;
  addedBy?: string;
}

const REGISTRY_KEY = 'jb3_user_registry';
const OWNER_EMAIL = 'jono@jonoblackburn.com';

const SEED_USERS: RegisteredUser[] = [
  { id: 'JONO', label: 'JONO', email: 'jono@jonoblackburn.com', isOwner: true, addedAt: 0 },
  { id: 'SUE', label: 'SUE', email: 'sue@jb3ai.com', addedAt: 0 },
  { id: 'BARTHO', label: 'BARTHO', email: 'bartho@jb3ai.com', addedAt: 0 },
  { id: 'GEORGE', label: 'GEORGE', email: 'george@jb3ai.com', addedAt: 0 },
  { id: 'TAMMY', label: 'TAMMY', email: 'tammy@jb3ai.com', addedAt: 0 },
  { id: 'CANDICE', label: 'CANDICE', email: 'candice@jb3ai.com', addedAt: 0 },
  { id: 'RADKIN', label: 'RADKIN', email: 'radkin@jb3ai.com', addedAt: 0 },
  { id: 'STEPHAN', label: 'STEPHAN', email: 'stephan@jb3ai.com', addedAt: 0 },
  { id: 'MUSSA', label: 'MUSSA', email: 'mussa@jb3ai.com', addedAt: 0 },
  { id: 'JASON', label: 'JASON', email: 'jason@jb3ai.com', addedAt: 0 },
  { id: 'NICOLETTE', label: 'NICOLETTE', email: 'nicolette@jb3ai.com', addedAt: 0 },
  { id: 'TRACY', label: 'TRACY', email: 'tracy@jb3ai.com', addedAt: 0 },
  { id: 'TEST', label: 'TEST', email: 'jonoelite@gmail.com', addedAt: 0 },
];

function loadRegistry(): RegisteredUser[] {
  const data = localStorage.getItem(REGISTRY_KEY);
  if (!data) {
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(SEED_USERS));
    return [...SEED_USERS];
  }
  return JSON.parse(data);
}

function saveRegistry(users: RegisteredUser[]): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(users));
}

export interface UserTab {
  id: string;
  label: string;
  email: UserEmail;
  isOwner?: boolean;
}

export const userRegistry = {
  getUsers: (): RegisteredUser[] => loadRegistry(),

  getTabs: (): UserTab[] => {
    return loadRegistry().map((u) => ({
      id: u.id,
      label: u.label,
      email: u.email,
      isOwner: u.isOwner,
    }));
  },

  getAllowlist: (): UserEmail[] => {
    return loadRegistry().map((u) => u.email);
  },

  addUser: (email: string, displayName: string): RegisteredUser => {
    const users = loadRegistry();
    const normalizedEmail = email.toLowerCase().trim();

    if (users.some((u) => u.email === normalizedEmail)) {
      throw new Error('User already exists in registry');
    }

    let id = displayName.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 12);

    let suffix = 1;
    const baseId = id;
    while (users.some((u) => u.id === id)) {
      id = `${baseId}${suffix}`;
      suffix++;
    }

    const newUser: RegisteredUser = {
      id,
      label: displayName.toUpperCase(),
      email: normalizedEmail,
      addedAt: Date.now(),
      addedBy: OWNER_EMAIL,
    };

    users.push(newUser);
    saveRegistry(users);
    return newUser;
  },

  removeUser: (email: string): void => {
    const users = loadRegistry();
    const normalizedEmail = email.toLowerCase().trim();

    if (normalizedEmail === OWNER_EMAIL) {
      throw new Error('Cannot remove owner');
    }

    const filtered = users.filter((u) => u.email !== normalizedEmail);
    saveRegistry(filtered);
  },

  getUserByEmail: (email: string): RegisteredUser | undefined => {
    return loadRegistry().find((u) => u.email === email.toLowerCase().trim());
  },

  isRegistered: (email: string): boolean => {
    return loadRegistry().some((u) => u.email === email.toLowerCase().trim());
  },
};
