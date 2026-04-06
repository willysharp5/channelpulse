-- Background CSV import jobs (processed by /api/import/cron with CRON_SECRET, same pattern as /api/sync/cron)

CREATE TABLE IF NOT EXISTS public.import_jobs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  channel_id uuid NOT NULL REFERENCES public.channels(id) ON DELETE CASCADE,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  import_type text NOT NULL CHECK (import_type IN ('orders', 'products', 'inventory')),
  status text NOT NULL DEFAULT 'queued' CHECK (status IN ('queued', 'running', 'completed', 'failed')),
  rows jsonb NOT NULL DEFAULT '[]'::jsonb,
  imported_count integer NOT NULL DEFAULT 0,
  skipped_count integer NOT NULL DEFAULT 0,
  error_message text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now(),
  started_at timestamptz,
  completed_at timestamptz
);

CREATE INDEX IF NOT EXISTS idx_import_jobs_org_created ON public.import_jobs(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_import_jobs_status_created ON public.import_jobs(status, created_at) WHERE status = 'queued';

ALTER TABLE public.import_jobs ENABLE ROW LEVEL SECURITY;

-- Members of the org can read their jobs
CREATE POLICY "import_jobs_select_org"
  ON public.import_jobs FOR SELECT
  TO authenticated
  USING (
    org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid())
  );

-- Inserts go through API (service role); optional user insert policy if we use anon client later — skip for simplicity

COMMENT ON TABLE public.import_jobs IS 'Queued CSV imports; worker is POST /api/import/cron with CRON_SECRET';
