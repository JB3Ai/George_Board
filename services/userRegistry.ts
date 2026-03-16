import { UserEmail } from '../types';
import { OWNER_EMAIL } from '../constants';
import { isSupabaseConfigured, supabase } from './supabaseClient';

export interface RegisteredUser {
  id: string;
  label: string;
  customName?: string;
  email: UserEmail;
  isOwner?: boolean;
  addedAt: number;
  addedBy?: string;
}

const REGISTRY_KEY = 'jb3_user_registry';
const REGISTRY_TABLE = 'user_registry';

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
  { id: 'MOUSSA_ES', label: 'MOUSSA', email: 'moussa@eaglestar.co.za', addedAt: 0 },
  { id: 'JASON_CT', label: 'JASON C', email: 'jason@computech-solutions.co.za', addedAt: 0 },
  { id: 'GEORGE_S', label: 'GEORGE S', email: 'gsourlis@yahoo.com', addedAt: 0 },
  { id: 'BARTHO_E', label: 'BARTHO E', email: 'berasmus@gmail.com', addedAt: 0 },
  { id: 'JONATHAN_R', label: 'JONATHAN', email: 'jonathantimothyrankin@gmail.com', addedAt: 0 },
  { id: 'STEPHAN_P', label: 'STEPHAN P', email: 'stephan@ppisolutions.co.za', addedAt: 0 },
  { id: 'TAMMY_H', label: 'TAMMY H', email: 'tammy.hughes1@gmail.com', addedAt: 0 },
  { id: 'TRACY_T', label: 'TRACY T', email: 'tracy.trace.1981@gmail.com', addedAt: 0 },
  { id: 'CANDICE_I', label: 'CANDICE', email: 'candice.017@icloud.com', addedAt: 0 },
];

// Map DB row (snake_case) → RegisteredUser
const fromRow = (row: any): RegisteredUser => ({
  id: row.id,
  label: row.label,
  customName: row.custom_name || undefined,
  email: row.email,
  isOwner: row.is_owner ?? false,
  addedAt: row.added_at ?? 0,
  addedBy: row.added_by ?? undefined,
});

// Map RegisteredUser → DB row
const toRow = (u: RegisteredUser) => ({
  id: u.id,
  label: u.label,
  custom_name: u.customName || null,
  email: u.email,
  is_owner: u.isOwner ?? false,
  added_at: u.addedAt,
  added_by: u.addedBy ?? null,
});

function ensureOwner(users: RegisteredUser[]): RegisteredUser[] {
  const hasOwner = users.some((u) => u.email.toLowerCase().trim() === OWNER_EMAIL && u.isOwner);
  if (hasOwner) return users;
  const ownerSeed = SEED_USERS.find((u) => u.email === OWNER_EMAIL)!;
  return [ownerSeed, ...users.filter((u) => u.email.toLowerCase().trim() !== OWNER_EMAIL)];
}

function loadRegistry(): RegisteredUser[] {
  const data = localStorage.getItem(REGISTRY_KEY);
  if (!data) {
    const seeded = ensureOwner([...SEED_USERS]);
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(seeded));
    return seeded;
  }
  try {
    const parsed = JSON.parse(data) as RegisteredUser[];
    const fixed = ensureOwner(Array.isArray(parsed) ? parsed : [...SEED_USERS]);
    if (fixed.length !== parsed.length) {
      localStorage.setItem(REGISTRY_KEY, JSON.stringify(fixed));
    }
    return fixed;
  } catch {
    const seeded = ensureOwner([...SEED_USERS]);
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(seeded));
    return seeded;
  }
}

function saveRegistry(users: RegisteredUser[]): void {
  localStorage.setItem(REGISTRY_KEY, JSON.stringify(users));
  // Mirror to Supabase — fire and forget
  if (!isSupabaseConfigured || !supabase) return;
  (supabase as any)
    .from(REGISTRY_TABLE)
    .upsert(users.map(toRow), { onConflict: 'email' })
    .then(({ error }: { error: any }) => {
      if (error) {
        console.error('[UserRegistry] Supabase upsert FAILED:', error.message, error);
        // If the error mentions a missing column, strip that field and retry
        if (error.message?.includes('custom_name')) {
          console.warn('[UserRegistry] Retrying without custom_name field...');
          const safeRows = users.map(toRow).map(({ custom_name, ...rest }: any) => rest);
          (supabase as any)
            .from(REGISTRY_TABLE)
            .upsert(safeRows, { onConflict: 'email' })
            .then(({ error: retryErr }: { error: any }) => {
              if (retryErr) console.error('[UserRegistry] Retry also failed:', retryErr.message);
              else console.log('[UserRegistry] Retry without custom_name succeeded');
            });
        }
      }
    });
}

// On first load, pull registry from Supabase and MERGE with localStorage
// (preserves local-only users that haven't synced yet)
export async function hydrateRegistryFromCloud(): Promise<void> {
  if (!isSupabaseConfigured || !supabase) return;
  try {
    const { data, error } = await (supabase as any)
      .from(REGISTRY_TABLE)
      .select('*')
      .order('added_at', { ascending: true });

    if (error || !Array.isArray(data) || data.length === 0) return;

    const cloudUsers = data.map(fromRow);
    const cloudEmails = new Set(cloudUsers.map((u: RegisteredUser) => u.email.toLowerCase().trim()));

    // Keep local-only users (added but not yet synced to cloud)
    const localUsers = loadRegistry();
    const localOnly = localUsers.filter((u) => !cloudEmails.has(u.email.toLowerCase().trim()));

    // Ensure all seed users survive the merge — prevents seed users from being
    // lost when they were never synced to cloud (e.g. upsert failures)
    const mergedEmails = new Set([
      ...cloudUsers.map((u: RegisteredUser) => u.email.toLowerCase().trim()),
      ...localOnly.map((u) => u.email.toLowerCase().trim()),
    ]);
    const missingSeed = SEED_USERS.filter((s) => !mergedEmails.has(s.email.toLowerCase().trim()));

    const merged = ensureOwner([...cloudUsers, ...localOnly, ...missingSeed]);
    localStorage.setItem(REGISTRY_KEY, JSON.stringify(merged));

    // Re-sync local-only users and missing seed users to cloud
    const usersToSync = [...localOnly, ...missingSeed];
    if (usersToSync.length > 0) {
      (supabase as any)
        .from(REGISTRY_TABLE)
        .upsert(usersToSync.map(toRow), { onConflict: 'email' })
        .then(({ error: syncErr }: { error: any }) => {
          if (syncErr) console.warn('Registry re-sync of local users failed:', syncErr.message);
        });
    }
  } catch {
    // silently fall back to localStorage
  }
}

export interface UserTab {
  id: string;
  label: string;
  customName?: string;
  email: UserEmail;
  isOwner?: boolean;
}

export const userRegistry = {
  getUsers: (): RegisteredUser[] => loadRegistry(),

  getTabs: (): UserTab[] => {
    return loadRegistry().map((u) => ({
      id: u.id,
      label: u.customName || u.label,
      customName: u.customName,
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

    // Also delete from Supabase
    if (isSupabaseConfigured && supabase) {
      (supabase as any)
        .from(REGISTRY_TABLE)
        .delete()
        .eq('email', normalizedEmail)
        .then(({ error }: { error: any }) => {
          if (error) console.warn('Registry delete failed:', error.message);
        });
    }
  },

  getUserByEmail: (email: string): RegisteredUser | undefined => {
    return loadRegistry().find((u) => u.email === email.toLowerCase().trim());
  },

  renameUser: (userId: string, customName: string): void => {
    const users = loadRegistry();
    const target = users.find(u => u.id === userId);
    if (!target) return;
    if (target.isOwner) return;
    target.customName = customName.trim() || undefined;
    saveRegistry(users);
  },

  isRegistered: (email: string): boolean => {
    return loadRegistry().some((u) => u.email === email.toLowerCase().trim());
  },
};
