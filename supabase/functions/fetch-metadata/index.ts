
// Deployment: supabase functions deploy fetch-metadata
declare const Deno: any;

import { serve } from "https://deno.land/std@0.131.0/http/server.ts"
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

serve(async (req) => {
  // Handle CORS
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { url } = await req.json()
    if (!url) throw new Error('URL is required')

    const supabase = createClient(
      Deno.env.get('SUPABASE_URL') ?? '',
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? ''
    )

    // 1. Authenticate User for Rate Limiting
    const authHeader = req.headers.get('Authorization')!
    const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''))
    if (authError || !user) return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 401, headers: corsHeaders })

    // 2. Rate Limit Check (30 requests per hour)
    const { data: logs, error: limitError } = await supabase
      .from('request_logs')
      .select('id')
      .eq('user_id', user.id)
      .gt('created_at', new Date(Date.now() - 3600000).toISOString())

    if (logs && logs.length >= 30) {
      return new Response(JSON.stringify({ error: 'Rate limit exceeded' }), { status: 429, headers: corsHeaders })
    }

    // Log request
    await supabase.from('request_logs').insert({ user_id: user.id, action: 'fetch_metadata', target: url })

    // 3. Cache Check
    const urlHash = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(url))))
      .map(b => b.toString(16).padStart(2, "0")).join("")

    const { data: cached } = await supabase
      .from('metadata_cache')
      .select('*')
      .eq('url_hash', urlHash)
      .single()

    if (cached) return new Response(JSON.stringify(cached.data), { headers: corsHeaders })

    // 4. Fetch and Parse (5s timeout)
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 5000)

    const response = await fetch(url, { 
      signal: controller.signal,
      headers: { 'User-Agent': 'JB3-Metadata-Bot/1.0 (Secure Proxy)' }
    })
    const html = await response.text()
    clearTimeout(timeoutId)

    const getMeta = (prop: string) => {
      const regex = new RegExp(`<meta[^>]+(?:property|name)=["']${prop}["'][^>]+content=["']([^"']+)["']`, 'i')
      const match = html.match(regex)
      return match ? match[1] : null
    }

    const metadata = {
      title: getMeta('og:title') || html.match(/<title>([^<]+)<\/title>/i)?.[1] || new URL(url).hostname,
      description: getMeta('og:description') || getMeta('description') || '',
      siteName: getMeta('og:site_name') || new URL(url).hostname.replace('www.', '').toUpperCase(),
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=128`,
      og_image_url: getMeta('og:image'),
    }

    // 5. Save to Cache
    await supabase.from('metadata_cache').insert({ url_hash: urlHash, url, data: metadata })

    return new Response(JSON.stringify(metadata), { headers: corsHeaders })

  } catch (err) {
    console.error(err)
    return new Response(JSON.stringify({ error: 'Enrichment failed', fallback: true }), { headers: corsHeaders })
  }
})
