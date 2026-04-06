-- How many CSV rows were new inserts vs updates to existing unique keys (clearer UX on re-import).

ALTER TABLE public.import_jobs
  ADD COLUMN IF NOT EXISTS inserted_new_count integer NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS updated_existing_count integer NOT NULL DEFAULT 0;

COMMENT ON COLUMN public.import_jobs.inserted_new_count IS 'Rows that did not exist before this import (new unique key).';
COMMENT ON COLUMN public.import_jobs.updated_existing_count IS 'Rows that matched an existing unique key and were updated / upserted in place.';
