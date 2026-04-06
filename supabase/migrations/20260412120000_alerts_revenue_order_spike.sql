-- Allow revenue_drop / order_spike (idempotent if already present from an updated 20260411120000)

ALTER TABLE public.alerts DROP CONSTRAINT IF EXISTS alerts_type_check;

ALTER TABLE public.alerts
  ADD CONSTRAINT alerts_type_check CHECK (
    type = ANY (
      ARRAY[
        'import_complete'::text,
        'import_failed'::text,
        'import_stalled'::text,
        'low_stock'::text,
        'sync_error'::text,
        'revenue_drop'::text,
        'order_spike'::text
      ]
    )
  );
