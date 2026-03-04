
import { LinkMetadata } from '../types';

/** Extract YouTube video ID from any youtube.com / youtu.be URL */
function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/(?:watch\?v=|embed\/|v\/|shorts\/)|youtu\.be\/)([\w-]{11})/
  );
  return match ? match[1] : null;
}

/**
 * Fetch Open Graph / preview metadata for a URL.
 *
 * - YouTube  → YouTube oEmbed API (browser-safe, no CORS issues)
 * - All else → microlink.io free tier (CORS-enabled, no API key needed)
 * - Fallback → Google favicon only
 */
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  // Validate URL
  try { new URL(url); } catch { return {}; }

  // ── YouTube ──────────────────────────────────────────────────────────────
  if (url.includes('youtube.com') || url.includes('youtu.be')) {
    try {
      const oembedUrl =
        `https://www.youtube.com/oembed?url=${encodeURIComponent(url)}&format=json`;
      const resp = await fetch(oembedUrl);
      if (resp.ok) {
        const data = await resp.json();
        const videoId = extractYouTubeId(url);
        return {
          title:       data.title              || undefined,
          siteName:    'YouTube',
          og_image_url: videoId
            ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`
            : data.thumbnail_url              || undefined,
          favicon: 'https://www.google.com/s2/favicons?domain=youtube.com&sz=64',
        };
      }
    } catch {/* fall through */}
    return {};
  }

  // ── All other URLs via microlink.io ───────────────────────────────────────
  try {
    const resp = await fetch(
      `https://api.microlink.io?url=${encodeURIComponent(url)}`,
      { headers: { 'Accept': 'application/json' } }
    );
    if (resp.ok) {
      const body = await resp.json();
      if (body.status === 'success') {
        const d = body.data;
        return {
          title:        d.title              || undefined,
          description:  d.description        || undefined,
          siteName:     d.publisher          || undefined,
          og_image_url: d.image?.url         || undefined,
          favicon:      d.logo?.url          || `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`,
        };
      }
    }
  } catch {/* fall through */}

  // ── Favicon-only fallback ─────────────────────────────────────────────────
  try {
    return {
      favicon: `https://www.google.com/s2/favicons?domain=${new URL(url).hostname}&sz=64`,
    };
  } catch {
    return {};
  }
}
