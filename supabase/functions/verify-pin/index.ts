

// NOTE: This is Deno code for Supabase Edge Functions
// Deployment: supabase functions deploy verify-pin

declare const Deno: any;

import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

// ── PBKDF2 helpers (Deno crypto.subtle) ─────────────────────────────────────

async function generateSalt(): Promise<string> {
  const buf = new Uint8Array(16);
  crypto.getRandomValues(buf);
  return Array.from(buf).map(b => b.toString(16).padStart(2, '0')).join('');
}

async function hashPin(pin: string, salt: string): Promise<string> {
  const enc = new TextEncoder();
  const keyMaterial = await crypto.subtle.importKey(
    'raw', enc.encode(pin), 'PBKDF2', false, ['deriveBits']
  );
  const bits = await crypto.subtle.deriveBits(
    { name: 'PBKDF2', salt: enc.encode(salt), iterations: 100_000, hash: 'SHA-256' },
    keyMaterial, 256
  );
  return Array.from(new Uint8Array(bits)).map(b => b.toString(16).padStart(2, '0')).join('');
}

// ── Constants ───────────────────────────────────────────────────────────────

const MAX_ATTEMPTS = 5;
const LOCKOUT_MS = 15 * 60 * 1000; // 15 minutes

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
};

function jsonResponse(body: Record<string, unknown>, status: number) {
  return new Response(JSON.stringify(body), { status, headers: { ...corsHeaders, 'Content-Type': 'application/json' } });
}

// ── Handler ─────────────────────────────────────────────────────────────────

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    const { action, email, pin } = await req.json();
    if (!action || !email) {
      return jsonResponse({ success: false, error: 'Missing required fields' }, 400);
    }

    const normalizedEmail = email.trim().toLowerCase();

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Fetch or auto-create profile
    let { data: profile, error: fetchError } = await supabase
      .from('profiles')
      .select('pin_hash, pin_salt, failed_pin_count, pin_lock_until')
      .eq('email', normalizedEmail)
      .maybeSingle();

    if (fetchError) {
      return jsonResponse({ success: false, error: 'Credential validation failed' }, 400);
    }

    // Auto-create profile row if user doesn't have one yet
    if (!profile) {
      const { error: insertError } = await supabase
        .from('profiles')
        .insert({ email: normalizedEmail });
      if (insertError) {
        return jsonResponse({ success: false, error: 'Credential validation failed' }, 400);
      }
      profile = { pin_hash: null, pin_salt: null, failed_pin_count: 0, pin_lock_until: null };
    }

    // ── Check lockout (applies to all actions) ──
    if (profile.pin_lock_until && new Date(profile.pin_lock_until) > new Date()) {
      const unlockAt = new Date(profile.pin_lock_until);
      const minsLeft = Math.ceil((unlockAt.getTime() - Date.now()) / 60_000);
      return jsonResponse({
        success: false,
        error: `Too many attempts. Try again in ${minsLeft} minute${minsLeft === 1 ? '' : 's'}.`,
        locked: true
      }, 403);
    }

    // ── ACTION: status ──
    if (action === 'status') {
      return jsonResponse({
        success: true,
        has_pin: !!profile.pin_hash,
      }, 200);
    }

    // ── ACTION: set ──
    if (action === 'set') {
      if (!pin || pin.length !== 4 || !/^\d{4}$/.test(pin)) {
        return jsonResponse({ success: false, error: 'PIN must be exactly 4 digits' }, 400);
      }
      const salt = await generateSalt();
      const hash = await hashPin(pin, salt);

      const { error: updateError } = await supabase
        .from('profiles')
        .update({
          pin_hash: hash,
          pin_salt: salt,
          failed_pin_count: 0,
          pin_lock_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('email', normalizedEmail);

      if (updateError) {
        return jsonResponse({ success: false, error: 'Credential validation failed' }, 500);
      }

      return jsonResponse({ success: true }, 200);
    }

    // ── ACTION: verify ──
    if (action === 'verify') {
      if (!pin) {
        return jsonResponse({ success: false, error: 'Credential validation failed' }, 400);
      }

      if (!profile.pin_hash || !profile.pin_salt) {
        // No PIN set — generic error (don't reveal that PIN isn't set)
        return jsonResponse({ success: false, error: 'Credential validation failed' }, 401);
      }

      const hash = await hashPin(pin, profile.pin_salt);
      const isValid = hash === profile.pin_hash;

      if (isValid) {
        // Clear failed attempts on success
        await supabase
          .from('profiles')
          .update({ failed_pin_count: 0, pin_lock_until: null, updated_at: new Date().toISOString() })
          .eq('email', normalizedEmail);

        // ── Phase 4.3: Issue Supabase Auth session ──────────────────────
        // Ensure auth.users row exists (no-op if user was already created)
        await supabase.auth.admin.createUser({
          email: normalizedEmail,
          email_confirm: true,
          password: crypto.randomUUID(),
        });
        // Ignore error — user may already exist

        // Generate magic-link token for server-side session exchange
        // (no email is sent — token is returned to frontend for verifyOtp)
        const { data: linkData, error: linkErr } = await supabase.auth.admin.generateLink({
          type: 'magiclink',
          email: normalizedEmail,
        });

        if (!linkErr && linkData?.properties?.hashed_token) {
          return jsonResponse({
            success: true,
            token_hash: linkData.properties.hashed_token,
          }, 200);
        }

        // Fallback: PIN verified but token generation failed
        // App works but JWT-based RLS for boards is inactive
        return jsonResponse({ success: true }, 200);
      } else {
        // Increment failed count, maybe lock
        const newCount = (profile.failed_pin_count || 0) + 1;
        const lockNow = newCount >= MAX_ATTEMPTS;
        const lockUntil = lockNow
          ? new Date(Date.now() + LOCKOUT_MS).toISOString()
          : null;

        await supabase
          .from('profiles')
          .update({
            failed_pin_count: newCount,
            pin_lock_until: lockUntil,
            updated_at: new Date().toISOString()
          })
          .eq('email', normalizedEmail);

        return jsonResponse({
          success: false,
          error: lockNow
            ? 'Too many attempts. Account locked for 15 minutes.'
            : 'Credential validation failed',
          locked: lockNow || undefined,
          attempts_remaining: Math.max(0, MAX_ATTEMPTS - newCount)
        }, lockNow ? 403 : 401);
      }
    }

    // ── ACTION: reset ──
    // Clears PIN credentials so user can set a new PIN on next login.
    // Requires that a profile row already exists (i.e. the user signed in before).
    if (action === 'reset') {
      if (!profile.pin_hash) {
        // No PIN to reset — succeed silently to avoid information leakage
        return jsonResponse({ success: true }, 200);
      }

      const { error: resetError } = await supabase
        .from('profiles')
        .update({
          pin_hash: null,
          pin_salt: null,
          failed_pin_count: 0,
          pin_lock_until: null,
          updated_at: new Date().toISOString()
        })
        .eq('email', normalizedEmail);

      if (resetError) {
        return jsonResponse({ success: false, error: 'Reset failed' }, 500);
      }

      return jsonResponse({ success: true }, 200);
    }

    return jsonResponse({ success: false, error: 'Unknown action' }, 400);

  } catch (err) {
    console.error('verify-pin error:', err);
    return jsonResponse({ success: false, error: 'Credential validation failed' }, 500);
  }
})