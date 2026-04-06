-- Schedule daily purge of import_jobs older than 3 days (requires pg_cron).
-- Runs 06:00 UTC; retention is still 3 days — daily runs only remove rows past that age.

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
