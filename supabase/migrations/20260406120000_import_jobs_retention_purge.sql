-- Remove import_jobs older than N days (bell "Review import" links stop working for purged ids).
-- Called from app via RPC with service role, or manually in SQL.

CREATE OR REPLACE FUNCTION public.purge_import_jobs_older_than(p_days integer DEFAULT 3)
RETURNS integer
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  n integer;
BEGIN
  IF p_days IS NULL OR p_days < 1 THEN
    p_days := 3;
  END IF;

  DELETE FROM public.import_jobs
  WHERE created_at < (now() - make_interval(days => p_days));

  GET DIAGNOSTICS n = ROW_COUNT;
  RETURN n;
END;
$$;

REVOKE ALL ON FUNCTION public.purge_import_jobs_older_than(integer) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.purge_import_jobs_older_than(integer) TO service_role;

COMMENT ON FUNCTION public.purge_import_jobs_older_than(integer) IS
  'Deletes import_jobs with created_at older than p_days (default 3). Schedule via POST /api/cron/import-jobs-retention.';
