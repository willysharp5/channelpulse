-- Per-org reporting: exclude channels from analytics (sidebar toggles).
-- Applied after orders_filtered_stats / inventory histogram migrations so RPCs are not overwritten.
ALTER TABLE public.organizations
  ADD COLUMN IF NOT EXISTS reporting_preferences jsonb NOT NULL DEFAULT '{"excluded_channel_ids":[]}'::jsonb;

DROP FUNCTION IF EXISTS public.orders_filtered_stats(uuid, text, text, text, timestamptz, timestamptz);

CREATE OR REPLACE FUNCTION public.orders_filtered_stats(
  p_org_id uuid,
  p_search text DEFAULT NULL,
  p_status text DEFAULT NULL,
  p_platform text DEFAULT NULL,
  p_ordered_at_since timestamptz DEFAULT NULL,
  p_ordered_at_until timestamptz DEFAULT NULL,
  p_channel_ids uuid[] DEFAULT NULL
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
  AND (p_ordered_at_until IS NULL OR o.ordered_at <= p_ordered_at_until)
  AND (p_channel_ids IS NULL OR o.channel_id = ANY(p_channel_ids));
$$;

GRANT EXECUTE ON FUNCTION public.orders_filtered_stats(uuid, text, text, text, timestamptz, timestamptz, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.orders_filtered_stats(uuid, text, text, text, timestamptz, timestamptz, uuid[]) TO service_role;

DROP FUNCTION IF EXISTS public.products_catalog_summary(uuid);

CREATE OR REPLACE FUNCTION public.products_catalog_summary(
  p_org_id uuid,
  p_channel_ids uuid[] DEFAULT NULL
)
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
WHERE p.org_id = p_org_id
  AND (p_channel_ids IS NULL OR p.channel_id = ANY(p_channel_ids));
$$;

GRANT EXECUTE ON FUNCTION public.products_catalog_summary(uuid, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.products_catalog_summary(uuid, uuid[]) TO service_role;

DROP FUNCTION IF EXISTS public.inventory_stock_histogram(uuid, text, timestamptz, text, timestamptz);

CREATE OR REPLACE FUNCTION public.inventory_stock_histogram(
  p_org_id uuid,
  p_search text DEFAULT NULL,
  p_cutoff timestamptz DEFAULT NULL,
  p_platform text DEFAULT NULL,
  p_cutoff_until timestamptz DEFAULT NULL,
  p_channel_ids uuid[] DEFAULT NULL
)
RETURNS jsonb
LANGUAGE sql
STABLE
SET search_path = public
AS $$
WITH filtered AS (
  SELECT COALESCE(p.inventory_quantity, 0)::numeric AS q
  FROM public.products p
  LEFT JOIN public.channels c ON c.id = p.channel_id AND c.org_id = p.org_id
  WHERE p.org_id = p_org_id
    AND (p_channel_ids IS NULL OR p.channel_id = ANY(p_channel_ids))
    AND (
      p_search IS NULL OR btrim(p_search) = '' OR (
        p.title ILIKE '%' || p_search || '%'
        OR COALESCE(p.sku, '') ILIKE '%' || p_search || '%'
        OR COALESCE(c.name, '') ILIKE '%' || p_search || '%'
      )
    )
    AND (
      p_cutoff IS NULL
      OR (p.inventory_updated_at IS NOT NULL AND p.inventory_updated_at >= p_cutoff)
    )
    AND (
      p_cutoff_until IS NULL
      OR (p.inventory_updated_at IS NOT NULL AND p.inventory_updated_at <= p_cutoff_until)
    )
    AND (
      p_platform IS NULL OR btrim(p_platform) = '' OR
      COALESCE(c.platform::text, p.platform::text, '') = p_platform
    )
),
dm AS (
  SELECT GREATEST(1, COALESCE(MAX(q::bigint), 0)::numeric) AS v FROM filtered
),
binned AS (
  SELECT LEAST(
    17,
    GREATEST(
      0,
      floor((f.q * 18.0) / NULLIF((SELECT v FROM dm) + 1, 0))::int
    )
  ) AS bin
  FROM filtered f
)
SELECT jsonb_build_object(
  'domain_max', (SELECT LEAST(2147483647, floor((SELECT v FROM dm)))::int),
  'counts', COALESCE(
    (
      SELECT jsonb_agg(s.cnt ORDER BY s.idx)
      FROM (
        SELECT gs.n AS idx, COALESCE(b.cnt, 0)::int AS cnt
        FROM generate_series(0, 17) AS gs(n)
        LEFT JOIN (
          SELECT bin, count(*)::int AS cnt FROM binned GROUP BY bin
        ) b ON b.bin = gs.n
      ) s
    ),
    '[]'::jsonb
  )
);
$$;

GRANT EXECUTE ON FUNCTION public.inventory_stock_histogram(uuid, text, timestamptz, text, timestamptz, uuid[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_stock_histogram(uuid, text, timestamptz, text, timestamptz, uuid[]) TO service_role;
