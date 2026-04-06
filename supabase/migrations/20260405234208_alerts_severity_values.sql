-- Align severity check with app usage: info, low, medium, high, critical.
-- (POST /api/alerts used `error` / `warning` which violated older CHECK constraints.)
-- Applied on remote as migration version 20260405234208.

ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_severity_check;

ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_severity_check CHECK (
    severity = ANY (
      ARRAY[
        'info'::text,
        'low'::text,
        'medium'::text,
        'high'::text,
        'critical'::text,
        'warning'::text,
        'error'::text
      ]
    )
  );
