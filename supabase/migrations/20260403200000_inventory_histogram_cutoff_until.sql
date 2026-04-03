-- Optional upper bound on inventory_updated_at for custom date ranges (histogram).
DROP FUNCTION IF EXISTS public.inventory_stock_histogram(uuid, text, timestamptz, text);

CREATE OR REPLACE FUNCTION public.inventory_stock_histogram(
  p_org_id uuid,
  p_search text DEFAULT NULL,
  p_cutoff timestamptz DEFAULT NULL,
  p_platform text DEFAULT NULL,
  p_cutoff_until timestamptz DEFAULT NULL
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

GRANT EXECUTE ON FUNCTION public.inventory_stock_histogram(uuid, text, timestamptz, text, timestamptz) TO authenticated;
GRANT EXECUTE ON FUNCTION public.inventory_stock_histogram(uuid, text, timestamptz, text, timestamptz) TO service_role;
