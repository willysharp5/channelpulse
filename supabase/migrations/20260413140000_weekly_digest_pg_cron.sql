-- Weekly digest: pg_cron + pg_net POSTs to the Next.js route (CRON_SECRET).
--
-- Add secrets (Supabase Dashboard -> Project Settings -> Vault, or SQL):
--   vault.create_secret(
--     'https://YOUR_DEPLOYMENT/api/email/weekly-digest',
--     'channelpulse_weekly_digest_url',
--     'Full URL for POST /api/email/weekly-digest'
--   );
--   vault.create_secret(
--     'SAME_AS_APP_CRON_SECRET',
--     'channelpulse_cron_secret',
--     'Bearer token; must match CRON_SECRET in the ChannelPulse app'
--   );
--
-- Schedule: Monday 09:00 UTC. Pause/resume via Admin -> Sync & Cron or set_admin_cron_job_active.

CREATE OR REPLACE FUNCTION public.trigger_weekly_digest_email()
RETURNS void
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  base_url text;
  secret text;
  req_id bigint;
BEGIN
  SELECT ds.decrypted_secret INTO base_url
  FROM vault.decrypted_secrets ds
  WHERE ds.name = 'channelpulse_weekly_digest_url'
  LIMIT 1;

  SELECT ds.decrypted_secret INTO secret
  FROM vault.decrypted_secrets ds
  WHERE ds.name = 'channelpulse_cron_secret'
  LIMIT 1;

  IF base_url IS NULL OR btrim(base_url) = '' OR secret IS NULL OR btrim(secret) = '' THEN
    RAISE NOTICE 'trigger_weekly_digest_email: missing vault secrets channelpulse_weekly_digest_url or channelpulse_cron_secret';
    RETURN;
  END IF;

  SELECT net.http_post(
    trim(base_url),
    '{}'::jsonb,
    '{}'::jsonb,
    jsonb_build_object(
      'Content-Type', 'application/json',
      'Authorization', 'Bearer ' || trim(secret)
    ),
    120000
  ) INTO req_id;

  RAISE NOTICE 'trigger_weekly_digest_email: net.http_post request_id=%', req_id;
END;
$$;

COMMENT ON FUNCTION public.trigger_weekly_digest_email() IS
  'pg_cron: POST weekly digest. Vault: channelpulse_weekly_digest_url, channelpulse_cron_secret.';

REVOKE ALL ON FUNCTION public.trigger_weekly_digest_email() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.trigger_weekly_digest_email() TO service_role;

DO $body$
DECLARE
  rec record;
BEGIN
  FOR rec IN SELECT jobid FROM cron.job WHERE jobname = 'weekly-digest-email'
  LOOP
    PERFORM cron.unschedule(rec.jobid);
  END LOOP;
END $body$;

SELECT cron.schedule(
  'weekly-digest-email',
  '0 9 * * 1',
  $$SELECT public.trigger_weekly_digest_email();$$
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
      ('purge_import_jobs_retention'::text, '0 6 * * *'::text, 'SELECT public.purge_import_jobs_older_than(3);'::text),
      ('weekly-digest-email'::text, '0 9 * * 1'::text, 'SELECT public.trigger_weekly_digest_email();'::text)
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
  ELSIF p_job_name = 'weekly-digest-email' THEN
    IF p_is_active THEN
      BEGIN
        PERFORM cron.unschedule('weekly-digest-email');
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
      PERFORM cron.schedule(
        'weekly-digest-email',
        '0 9 * * 1',
        $$SELECT public.trigger_weekly_digest_email();$$
      );
    ELSE
      BEGIN
        PERFORM cron.unschedule('weekly-digest-email');
      EXCEPTION WHEN OTHERS THEN
        NULL;
      END;
    END IF;
  ELSE
    RAISE EXCEPTION 'Unknown cron job: %', p_job_name;
  END IF;
END;
$fn$;
