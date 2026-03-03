
# Clipboard Production Deployment Guide (V0.5)

### 1. Edge Function Deployment
Deploy the metadata service to your Supabase project:
```bash
supabase functions deploy fetch-metadata
```

### 2. Environment Variables
Ensure your Supabase project has the following secrets configured:
- `SUPABASE_URL`: Your project URL.
- `SUPABASE_SERVICE_ROLE_KEY`: Service role key for bypass RLS on cache writes.

For the frontend build, also set:
- `VITE_SUPABASE_URL`
- `VITE_SUPABASE_ANON_KEY`

### 3. Database Schema
Execute the updated `SQL.sql` in your Supabase SQL Editor. This adds:
- `metadata_cache`: Stores results to prevent redundant scrapes.
- `request_logs`: Powers the user-based rate limiting (30 req/hr).
- `clipboard_state`: Cloud-backed snapshot for clipboard memory recovery.

### 4. Frontend Integration
Update `services/metadata.ts` with your actual Supabase project ID in the fetch URL. If using the official Supabase SDK, use `supabase.functions.invoke('fetch-metadata', { body: { url } })`.
