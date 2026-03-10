import { userRegistry } from './userRegistry';
import { OWNER_EMAIL } from '../constants';
import { isSupabaseConfigured, supabase } from './supabaseClient';

const EDGE_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/verify-pin`;
const ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY ?? '';

// ── Allowlist (unchanged — reads user_registry) ─────────────────────────────

export function isAllowlisted(email: string): boolean {
  const normalized = email.trim().toLowerCase();
  if (normalized === OWNER_EMAIL) return true;
  return userRegistry.isRegistered(normalized);
}

// ── Edge function caller ────────────────────────────────────────────────────

async function callVerifyPin(body: { action: string; email: string; pin?: string }): Promise<{ success: boolean; error?: string; has_pin?: boolean; locked?: boolean; attempts_remaining?: number; token_hash?: string }> {
  try {
    const resp = await fetch(EDGE_URL, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'apikey': ANON_KEY },
      body: JSON.stringify(body),
    });
    return await resp.json();
  } catch {
    return { success: false, error: 'Network error. Please try again.' };
  }
}

// ── First-time detection (server-side via status action) ────────────────────

export async function checkPinStatus(email: string): Promise<{ has_pin: boolean; locked?: boolean; error?: string }> {
  const result = await callVerifyPin({ action: 'status', email: email.trim().toLowerCase() });
  if (!result.success) {
    return { has_pin: false, error: result.error };
  }
  return { has_pin: !!result.has_pin, locked: result.locked };
}

// ── Supabase auth interface (consumed by SessionGuard + App.tsx) ────────────

export const supabaseAuth = {
  verifyPin: async (email: string, pin: string): Promise<{ success: boolean; error?: string; attempts_remaining?: number; token_hash?: string }> => {
    return callVerifyPin({ action: 'verify', email: email.trim().toLowerCase(), pin });
  },

  setPin: async (email: string, pin: string): Promise<{ success: boolean; error?: string }> => {
    return callVerifyPin({ action: 'set', email: email.trim().toLowerCase(), pin });
  },

  resetPin: async (email: string): Promise<{ success: boolean; error?: string }> => {
    const normalizedEmail = email.trim().toLowerCase();
    // Clear local session artifacts
    localStorage.removeItem(`pin_hash_${normalizedEmail}`);
    // Server-side: clear pin_hash, pin_salt, failed attempts, and lock
    return callVerifyPin({ action: 'reset', email: normalizedEmail });
  }
};
