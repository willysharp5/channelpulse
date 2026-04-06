-- Human-readable import outcome (matches post-import toast) for admin audit / detail sheet.

ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS outcome_summary text;

COMMENT ON COLUMN public.import_jobs.outcome_summary IS
  'What happened for this job (new vs updated, skips) — same copy as the user-facing import notification.';
