
import { LinkMetadata } from '../types';
import { isSupabaseConfigured, supabase } from './supabaseClient';

// ── Helpers ──────────────────────────────────────────────────────────────────

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

function isYouTube(url: string): boolean {
  return url.includes('youtube.com') || url.includes('youtu.be');
}

async function sha256(text: string): Promise<string> {
  const buf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(text));
  return Array.from(new Uint8Array(buf)).map(b => b.toString(16).padStart(2, '0')).join('');
}

function faviconUrl(url: string): string {
  try {
    return `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`;
  } catch {
    return '';
  }
}

function isValidMetadata(m: LinkMetadata | null | undefined): m is LinkMetadata {
  return !!m && (!!m.title || !!m.siteName || !!m.og_image_url);
}

const CACHE_MAX_AGE_MS = 7 * 24 * 60 * 60 * 1000; // 7 days

// ── Cache layer (reads/writes metadata_cache via Supabase client) ────────────

async function checkCache(url: string): Promise<LinkMetadata | null> {
  if (!isSupabaseConfigured || !supabase) return null;
  try {
    const hash = await sha256(url);
    const { data } = await (supabase as any)
      .from('metadata_cache')
      .select('data, created_at')
      .eq('url_hash', hash)
      .maybeSingle();
    if (!data) return null;
    const age = Date.now() - new Date(data.created_at).getTime();
    if (age > CACHE_MAX_AGE_MS) return null; // stale
    return data.data as LinkMetadata;
  } catch {
    return null;
  }
}

// Cache writes removed — client has SELECT-only on metadata_cache.
// The fetch-metadata edge function writes cache via service role.

// ── YouTube (client-side oEmbed, CORS-friendly) ─────────────────────────────

async function fetchYouTube(url: string): Promise<LinkMetadata> {
  const oembedUrl = `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
  const resp = await fetch(oembedUrl);
  if (!resp.ok) return { favicon: faviconUrl(url) };
  const data = await resp.json();
  const videoId = extractYouTubeId(url);
  return {
    title: data.title || undefined,
    siteName: 'YouTube',
    og_image_url: videoId
      ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
      : data.thumbnail_url || undefined,
    favicon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
  };
}

// ── Edge function fetch (general URLs) ──────────────────────────────────────

const EDGE_METADATA_URL = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/fetch-metadata`;

async function fetchViaEdge(url: string): Promise<LinkMetadata> {
  const resp = await fetch(EDGE_METADATA_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'apikey': import.meta.env.VITE_SUPABASE_ANON_KEY ?? '',
    },
    body: JSON.stringify({ url }),
  });
  if (!resp.ok) throw new Error(`Edge function returned ${resp.status}`);
  const data = await resp.json();
  if (data.error) throw new Error(data.error);
  return data as LinkMetadata;
}

// ── Public API ──────────────────────────────────────────────────────────────

/**
 * Resolve metadata for a URL. Cache-first, then edge function or oEmbed.
 * Returns metadata if available, empty object on terminal failure.
 * Never throws -- callers check isValidMetadata() on the result.
 */
export async function resolveMetadata(url: string): Promise<LinkMetadata> {
  try { new URL(url); } catch { return {}; }

  // 1. Cache check
  const cached = await checkCache(url);
  if (isValidMetadata(cached)) return cached;

  // 2. Fetch
  let metadata: LinkMetadata;
  try {
    metadata = isYouTube(url) ? await fetchYouTube(url) : await fetchViaEdge(url);
  } catch {
    // Favicon-only fallback
    return { favicon: faviconUrl(url) };
  }

  // Cache is written server-side by the edge function (service role).
  // No client-side write needed.

  return metadata;
}

/** Re-export for backward compat during migration. Will be removed. */
export const fetchLinkMetadata = resolveMetadata;

/** Check if metadata result has meaningful content */
export { isValidMetadata };
