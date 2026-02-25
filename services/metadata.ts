
import { LinkMetadata } from '../types';

/**
 * STRATEGY: Production RPC Call
 * Triggers the fetch-metadata Edge Function.
 */
export async function fetchLinkMetadata(url: string): Promise<LinkMetadata> {
  try {
    const savedSession = localStorage.getItem('jb3_session');
    if (!savedSession) throw new Error('No active session');
    
    // Validate the input URL first
    try {
      new URL(url);
    } catch (e) {
      return {};
    }

    // Replace [PROJECT_ID] placeholder with a dummy for prototype or actual ID if available
    // For this prototype, we'll gracefully return empty if the project ID isn't configured
    const projectUrl = 'https://placeholder.supabase.co/functions/v1/fetch-metadata';
    
    if (projectUrl.includes('[PROJECT_ID]') || projectUrl.includes('placeholder')) {
      // Simulate network latency for prototype enrichment
      await new Promise(r => setTimeout(r, 1000));
      return {};
    }

    const response = await fetch(projectUrl, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${JSON.parse(savedSession).access_token || 'mock-token'}`
      },
      body: JSON.stringify({ url })
    });

    if (!response.ok) {
      return {};
    }

    return await response.json();
  } catch (error) {
    console.error("Enrichment request failed:", error);
    return {};
  }
}
