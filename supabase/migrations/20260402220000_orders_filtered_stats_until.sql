-- Optional upper bound on ordered_at for custom date ranges + stats RPC.
DROP FUNCTION IF EXISTS public.orders_filtered_stats(uuid, text, text, text, timestamptz);

CREATE OR REPLACE FUNCTION public.orders_filtered_stats(
  p_org_id uuid,
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_platform text DEFAULT NULL,
  p_ordered_at_since timestamptz DEFAULT NULL,
  p_ordered_at_until timestamptz DEFAULT NULL
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
  )
  AND (p_ordered_at_since IS NULL OR o.ordered_at >= p_ordered_at_since)
  AND (p_ordered_at_until IS NULL OR o.ordered_at <= p_ordered_at_until);
$$;

GRANT EXECUTE ON FUNCTION public.orders_filtered_stats(uuid, text, text, text, timestamptz, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orders_filtered_stats(uuid, text, text, text, timestamptz, timestamptz) TO service_role;
