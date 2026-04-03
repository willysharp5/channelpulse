-- Aggregates for server-filtered orders list (KPIs + counts without loading all rows).
CREATE OR REPLACE FUNCTION public.orders_filtered_stats(
  p_org_id uuid,
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_platform text DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
SELECT jsonb_build_object(
  'total_count', count(*)::bigint,
  'total_revenue', coalesce(sum(o.total_amount), 0)::double precision,
  'total_profit', coalesce(sum(o.net_profit), 0)::double precision,
  'total_fees', coalesce(sum(o.platform_fees), 0)::double precision
)
FROM public.orders o
WHERE o.org_id = p_org_id
  AND (p_status IS NULL OR btrim(p_status) = '' OR lower(p_status) = 'all' OR o.status = p_status)
  AND (p_platform IS NULL OR btrim(p_platform) = '' OR lower(p_platform) = 'all' OR o.platform = p_platform)
  AND (
    p_search IS NULL OR btrim(p_search) = ''
    OR coalesce(o.order_number, '') ILIKE '%' || p_search || '%'
    OR coalesce(o.customer_name, '') ILIKE '%' || p_search || '%'
    OR o.total_amount::text ILIKE '%' || p_search || '%'
  );
$$;

GRANT EXECUTE ON FUNCTION public.orders_filtered_stats(uuid, text, text, text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orders_filtered_stats(uuid, text, text, text) TO service_role;

-- KPI strip on products page (full catalog, no table filters).
CREATE OR REPLACE FUNCTION public.products_catalog_summary(p_org_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
SELECT jsonb_build_object(
  'total', count(*)::int,
  'active', count(*) filter (where p.status = 'active')::int,
  'draft', count(*) filter (where p.status = 'draft')::int,
  'archived', count(*) filter (where p.status = 'archived')::int,
  'total_cogs', coalesce(sum(p.cogs), 0)::double precision
)
FROM public.products p
WHERE p.org_id = p_org_id;
$$;

GRANT EXECUTE ON FUNCTION public.products_catalog_summary(uuid) TO authenticated;
GRANT EXECUTE ON FUNCTION public.products_catalog_summary(uuid) TO service_role;
