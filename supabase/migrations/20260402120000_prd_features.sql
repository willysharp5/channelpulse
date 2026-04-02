-- PRD: inventory, notifications preferences, dashboard tour flag, alerts table (if missing), product sync columns

-- Products: inventory & channel linkage for Shopify sync
ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_quantity integer NOT NULL DEFAULT 0;
ALTER TABLE products ADD COLUMN IF NOT EXISTS inventory_updated_at timestamptz;
ALTER TABLE products ADD COLUMN IF NOT EXISTS channel_id uuid REFERENCES channels(id) ON DELETE SET NULL;
ALTER TABLE products ADD COLUMN IF NOT EXISTS platform text;
ALTER TABLE products ADD COLUMN IF NOT EXISTS platform_product_id text;

CREATE INDEX IF NOT EXISTS idx_products_org_channel ON products(org_id, channel_id);

-- Organizations: notification preferences (JSON)
ALTER TABLE organizations ADD COLUMN IF NOT EXISTS notification_preferences jsonb NOT NULL DEFAULT '{}'::jsonb;

-- Profiles: first-visit dashboard tour
ALTER TABLE profiles ADD COLUMN IF NOT EXISTS has_seen_dashboard_tour boolean NOT NULL DEFAULT false;

-- Alerts (create if not exists — adjust if your project already has this table with different shape)
CREATE TABLE IF NOT EXISTS alerts (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  org_id uuid NOT NULL REFERENCES organizations(id) ON DELETE CASCADE,
  type text NOT NULL,
  severity text NOT NULL DEFAULT 'info',
  title text NOT NULL,
  message text NOT NULL,
  metadata jsonb DEFAULT '{}'::jsonb,
  is_read boolean NOT NULL DEFAULT false,
  is_dismissed boolean NOT NULL DEFAULT false,
  created_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_alerts_org_created ON alerts(org_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_alerts_org_unread ON alerts(org_id) WHERE is_read = false AND is_dismissed = false;

ALTER TABLE alerts ENABLE ROW LEVEL SECURITY;

-- RLS: org members can read/write their org alerts (via profiles.org_id = alerts.org_id)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'alerts_select_org'
  ) THEN
    CREATE POLICY alerts_select_org ON alerts FOR SELECT
      USING (
        org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'alerts_update_org'
  ) THEN
    CREATE POLICY alerts_update_org ON alerts FOR UPDATE
      USING (
        org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
      );
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'alerts' AND policyname = 'alerts_insert_org'
  ) THEN
    CREATE POLICY alerts_insert_org ON alerts FOR INSERT
      WITH CHECK (
        org_id IN (SELECT org_id FROM profiles WHERE id = auth.uid())
      );
  END IF;
END $$;
