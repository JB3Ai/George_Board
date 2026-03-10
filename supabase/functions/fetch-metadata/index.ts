
// Deployment: supabase functions deploy fetch-metadata
// Accepts anon-key requests (no JWT). Rate-limits by url_hash.
// All DB operations use service role key (bypasses RLS).
declare const Deno: any;

import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

function jsonResponse(body: Record<string, unknown>, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { ...corsHeaders, 'Content-Type': 'application/json' },
  });
}

serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  try {
    const { url } = await req.json();
    if (!url || typeof url !== 'string') {
      return jsonResponse({ error: 'URL is required' }, 400);
    }

    // Validate URL format + protocol (SSRF mitigation)
    let parsed: URL;
    try { parsed = new URL(url); } catch {
      return jsonResponse({ error: 'Invalid URL' }, 400);
    }
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return jsonResponse({ error: 'Invalid URL protocol' }, 400);
    }

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    );

    // Hash the URL for cache + rate-limit keying
    const urlHashBuf = await crypto.subtle.digest('SHA-256', new TextEncoder().encode(url));
    const urlHash = Array.from(new Uint8Array(urlHashBuf))
      .map(b => b.toString(16).padStart(2, '0')).join('');

    // 1. Cache check (server-side safety net; client also checks via SELECT)
    const { data: cached } = await supabase
      .from('metadata_cache')
      .select('data')
      .eq('url_hash', urlHash)
      .maybeSingle();

    if (cached?.data) {
      return jsonResponse(cached.data as Record<string, unknown>);
    }

    // 2. Rate limit: max 5 fetch attempts per URL per hour
    const { data: recentLogs } = await supabase
      .from('request_logs')
      .select('id')
      .eq('target', urlHash)
      .eq('action', 'fetch_metadata')
      .gt('created_at', new Date(Date.now() - 3600000).toISOString());

    if (recentLogs && recentLogs.length >= 5) {
      return jsonResponse({ error: 'Rate limit exceeded for this URL' }, 429);
    }

    // 3. Log the attempt (user_email NOT NULL — use system sentinel)
    await supabase.from('request_logs').insert({
      user_email: 'system@fetch-metadata',
      action: 'fetch_metadata',
      target: urlHash,
    });

    // 4. Fetch and parse (5s timeout)
    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 5000);

    const response = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'JB3-Metadata-Bot/1.0 (Secure Proxy)' },
    });
    const html = await response.text();
    clearTimeout(timeoutId);

    const getMeta = (prop: string) => {
      const regex = new RegExp(
        `<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i'
      );
      return html.match(regex)?.[1] ?? null;
    };

    const hostname = parsed.hostname;
    const metadata = {
      title: getMeta('og:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1] || hostname,
      description: getMeta('og:description') || getMeta('description') || '',
      siteName: getMeta('og:site_name') || hostname.replace('www.', '').toUpperCase(),
      favicon: `https://www.google.com/s2/favicons?domain=${hostname}&sz=128`,
      og_image_url: getMeta('og:image'),
    };

    // 5. Write to cache (upsert — handles stale entries)
    await supabase.from('metadata_cache').upsert(
      { url_hash: urlHash, url, data: metadata, created_at: new Date().toISOString() },
      { onConflict: 'url_hash' }
    );

    return jsonResponse(metadata as unknown as Record<string, unknown>);

  } catch (err) {
    console.error('fetch-metadata error:', err);
    return jsonResponse({ error: 'Enrichment failed', fallback: true }, 500);
  }
})
