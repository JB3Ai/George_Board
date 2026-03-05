import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY;

const hasValidUrl = (() => {
  if (!supabaseUrl) return false;
  try {
    const parsed = new URL(supabaseUrl);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
})();

export const isSupabaseConfigured = Boolean(hasValidUrl && supabaseAnonKey);

/* diagnostic — visible in browser console (F12) */
console.log('[Supabase]', {
  hasUrl: !!supabaseUrl,
  hasKey: !!supabaseAnonKey,
  validUrl: hasValidUrl,
  configured: isSupabaseConfigured,
});

let client: ReturnType<typeof createClient> | null = null;

if (isSupabaseConfigured) {
  try {
    client = createClient(supabaseUrl!, supabaseAnonKey!, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    });
  } catch (error) {
    console.warn('Supabase client initialization failed, continuing with local storage only.');
    client = null;
  }
}

export const supabase = client;
