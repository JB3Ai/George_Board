
-- ... (Existing SQL above) ...

-- 6. Metadata Caching System
CREATE TABLE public.metadata_cache (
  url_hash TEXT PRIMARY KEY,
  url TEXT NOT NULL,
  data JSONB NOT NULL,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- Auto-expire cache after 7 days
CREATE INDEX idx_metadata_expiry ON public.metadata_cache(created_at);

-- 7. Request Logging (Rate Limiting)
CREATE TABLE public.request_logs (
  id UUID DEFAULT uuid_generate_v4() PRIMARY KEY,
  user_id UUID REFERENCES auth.users ON DELETE CASCADE NOT NULL,
  action TEXT NOT NULL,
  target TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_logs_user_recent ON public.request_logs(user_id, created_at);

-- RLS for logs (Internal use only, but good practice)
ALTER TABLE public.metadata_cache ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.request_logs ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Internal Read" ON public.metadata_cache FOR SELECT TO authenticated USING (true);

-- 8. Clipboard State Snapshot (Cloud Persistence)
CREATE TABLE IF NOT EXISTS public.clipboard_state (
  id TEXT PRIMARY KEY,
  payload JSONB NOT NULL DEFAULT '[]'::jsonb,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

ALTER TABLE public.clipboard_state ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Clipboard state read" ON public.clipboard_state
FOR SELECT TO anon, authenticated
USING (true);

CREATE POLICY "Clipboard state write" ON public.clipboard_state
FOR INSERT TO anon, authenticated
WITH CHECK (true);

CREATE POLICY "Clipboard state update" ON public.clipboard_state
FOR UPDATE TO anon, authenticated
USING (true)
WITH CHECK (true);
