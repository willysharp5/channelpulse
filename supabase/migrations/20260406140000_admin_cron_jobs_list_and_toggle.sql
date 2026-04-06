-- Admin dashboard: list both pg_cron jobs and pause/resume each independently.

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

-- Backwards compatible: admin "pause/resume" for channel sync only
CREATE OR REPLACE FUNCTION public.update_cron_job_active(is_active boolean)
RETURNS void
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT public.set_admin_cron_job_active('sync-all-channels', is_active);
$$;

REVOKE ALL ON FUNCTION public.get_cron_jobs_admin() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.get_cron_jobs_admin() TO service_role;

REVOKE ALL ON FUNCTION public.set_admin_cron_job_active(text, boolean) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.set_admin_cron_job_active(text, boolean) TO service_role;
