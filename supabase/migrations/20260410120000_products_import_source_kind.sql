-- Distinguish catalog rows from product CSV vs inventory CSV (Data source filters).

ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS import_source_kind text
  CHECK (import_source_kind IS NULL OR import_source_kind IN ('product_csv', 'inventory_csv'));

COMMENT ON COLUMN public.products.import_source_kind IS
  'product_csv = last tied to product import; inventory_csv = last tied to inventory import; NULL = sync/other';

-- Existing rows created via CSV product import use csv- platform_product_id
UPDATE public.products
SET import_source_kind = 'product_csv'
WHERE import_source_kind IS NULL
  AND platform_product_id IS NOT NULL
  AND platform_product_id LIKE 'csv-%';

CREATE INDEX IF NOT EXISTS idx_products_org_import_kind
  ON public.products (org_id, import_source_kind)
  WHERE import_source_kind IS NOT NULL;
