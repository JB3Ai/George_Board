import { userRegistry } from './userRegistry';
import { OWNER_EMAIL } from '../constants';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const pinKey = (email: string) => `pin_hash_${email.trim().toLowerCase()}`;

const DEFAULT_PINS: Record<string, string> = {
  'jono@jonoblackburn.com': '4020',
  'sue@jb3ai.com': '1234',
  'bartho@jb3ai.com': '1234',
  'george@jb3ai.com': '1234',
  'tammy@jb3ai.com': '1234',
  'candice@jb3ai.com': '1234',
  'radkin@jb3ai.com': '1234',
  'stephan@jb3ai.com': '1234',
  'mussa@jb3ai.com': '1234',
  'jason@jb3ai.com': '1234',
  'nicolette@jb3ai.com': '1234',
  'tracy@jb3ai.com': '1234'
};

export function isAllowlisted(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (normalized === OWNER_EMAIL) return true;
  return userRegistry.isRegistered(normalized);
}

export function isFirstTimeUser(email: string): boolean {
  const normalized = pinKey(email);
  const legacy = `pin_hash_${email}`;
  return !localStorage.getItem(normalized) && !localStorage.getItem(legacy);
}

export const supabaseAuth = {
  verifyPin: async (email: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    await new Promise((resolve) => setTimeout(resolve, 800));

    const normalizedEmail = email.trim().toLowerCase();
    const localKey = pinKey(email);
    const legacyKey = `pin_hash_${email}`;

    // 1. Try Supabase first (source of truth)
    if (isSupabaseConfigured && supabase) {
      try {
        const { data } = await (supabase as any)
          .from('user_profiles')
          .select('pin')
          .eq('email', normalizedEmail)
          .maybeSingle();

        const storedPin = (data as any)?.pin as string | null;
        if (storedPin) {
          // Keep localStorage in sync as a fast cache
          localStorage.setItem(localKey, storedPin);
          return pin === storedPin
            ? { success: true }
            : { success: false, error: 'Credential validation failed' };
        }
      } catch {
        // fall through to local
      }
    }

    // 2. Fallback: localStorage cache → seed defaults
    const storedPin =
      localStorage.getItem(localKey) ||
      localStorage.getItem(legacyKey) ||
      DEFAULT_PINS[normalizedEmail] ||
      '1234';

    return pin === storedPin
      ? { success: true }
      : { success: false, error: 'Credential validation failed' };
  },

  setPin: async (email: string, pin: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    // Write to localStorage immediately for offline access
    localStorage.setItem(pinKey(email), pin);
    // Persist to Supabase as source of truth
    if (isSupabaseConfigured && supabase) {
      const { error } = await (supabase as any)
        .from('user_profiles')
        .upsert(
          { email: normalizedEmail, pin, updated_at: new Date().toISOString() },
          { onConflict: 'email' }
        );
      if (error) console.warn('Supabase PIN save failed:', error.message);
    }
  },

  resetPin: async (email: string) => {
    const normalizedEmail = email.trim().toLowerCase();
    localStorage.removeItem(pinKey(email));
    localStorage.removeItem(`pin_hash_${email}`);
    if (isSupabaseConfigured && supabase) {
      const { error } = await (supabase as any)
        .from('user_profiles')
        .upsert(
          { email: normalizedEmail, pin: null, updated_at: new Date().toISOString() },
          { onConflict: 'email' }
        );
      if (error) console.warn('Supabase PIN reset failed:', error.message);
    }
  }
};
