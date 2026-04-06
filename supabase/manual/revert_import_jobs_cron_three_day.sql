-- Revert import retention cron to 3-day purge (production behavior).
-- Run this in the Supabase SQL editor when you are done testing delete-all cron runs.
--
-- After running: the job `purge_import_jobs_retention` will execute
--   SELECT public.purge_import_jobs_older_than(3);
-- daily at 06:00 UTC again.

DO $body$
DECLARE
  rec record;
BEGIN
  FOR rec IN SELECT jobid FROM cron.job WHERE jobname = 'purge_import_jobs_retention'
  LOOP
    PERFORM cron.unschedule(rec.jobid);
  END LOOP;
END $body$;

SELECT cron.schedule(
  'purge_import_jobs_retention',
  '0 6 * * *',
  $$SELECT public.purge_import_jobs_older_than(3);$$
);

CREATE OR REPLACE FUNCTION public.get_cron_jobs_admin()
RETURNS TABLE (
  job_name text,
  jobid bigint,
  schedule text,
  active boolean,
  command text,
  last_run timestamptz,
  last_status text
)
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    v.name AS job_name,
    COALESCE(j.jobid, 0)::bigint AS jobid,
    COALESCE(j.schedule, v.default_schedule)::text AS schedule,
    COALESCE(j.active, false) AS active,
    COALESCE(j.command, v.default_cmd)::text AS command,
    d.start_time AS last_run,
    d.status::text AS last_status
  FROM (
    VALUES
      ('sync-all-channels'::text, '*/15 * * * *'::text, 'SELECT trigger_channel_syncs();'::text),
      ('purge_import_jobs_retention'::text, '0 6 * * *'::text, 'SELECT public.purge_import_jobs_older_than(3);'::text)
  ) AS v(name, default_schedule, default_cmd)
  LEFT JOIN cron.job j ON j.jobname = v.name
  LEFT JOIN LATERAL (
    SELECT rd.start_time, rd.status
    FROM cron.job_run_details rd
    WHERE j.jobid IS NOT NULL AND rd.jobid = j.jobid
    ORDER BY rd.start_time DESC
    LIMIT 1
  ) d ON true;
$$;

CREATE OR REPLACE FUNCTION public.set_admin_cron_job_active(p_job_name text, p_is_active boolean)
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $fn$
BEGIN
  IF p_job_name = 'sync-all-channels' THEN
    IF p_is_active THEN
      BEGIN
        PERFORM cron.unschedule('sync-all-channels');
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
      PERFORM cron.schedule('sync-all-channels', '*/15 * * * *', 'SELECT trigger_channel_syncs()');
    ELSE
      BEGIN
        PERFORM cron.unschedule('sync-all-channels');
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  ELSIF p_job_name = 'purge_import_jobs_retention' THEN
    IF p_is_active THEN
      BEGIN
        PERFORM cron.unschedule('purge_import_jobs_retention');
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
      PERFORM cron.schedule(
        'purge_import_jobs_retention',
        '0 6 * * *',
        $$SELECT public.purge_import_jobs_older_than(3);$$
      );
    ELSE
      BEGIN
        PERFORM cron.unschedule('purge_import_jobs_retention');
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown cron job: %', p_job_name;
  END IF;
END;
$fn$;

-- Optional: drop test helper (cron no longer references it)
-- DROP FUNCTION IF EXISTS public.purge_import_jobs_all();
