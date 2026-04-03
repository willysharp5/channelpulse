-- Optional per-store P&L assumptions (null = use org-wide defaults from cost_settings)
CREATE TABLE IF NOT EXISTS public.channel_pnl_settings (
  channel_id uuid NOT NULL PRIMARY KEY REFERENCES public.channels(id) ON DELETE CASCADE,
  org_id uuid NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
  platform_fee_percent double precision,
  platform_fee_flat double precision,
  marketing_monthly double precision,
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS channel_pnl_settings_org_id_idx ON public.channel_pnl_settings(org_id);

ALTER TABLE public.cost_settings
  ADD COLUMN IF NOT EXISTS use_modeled_platform_fees boolean NOT NULL DEFAULT false;

ALTER TABLE public.channel_pnl_settings ENABLE ROW LEVEL SECURITY;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channel_pnl_settings' AND policyname = 'channel_pnl_settings_select_org'
  ) THEN
    CREATE POLICY channel_pnl_settings_select_org ON public.channel_pnl_settings FOR SELECT
      USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channel_pnl_settings' AND policyname = 'channel_pnl_settings_insert_org'
  ) THEN
    CREATE POLICY channel_pnl_settings_insert_org ON public.channel_pnl_settings FOR INSERT
      WITH CHECK (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channel_pnl_settings' AND policyname = 'channel_pnl_settings_update_org'
  ) THEN
    CREATE POLICY channel_pnl_settings_update_org ON public.channel_pnl_settings FOR UPDATE
      USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_policies WHERE tablename = 'channel_pnl_settings' AND policyname = 'channel_pnl_settings_delete_org'
  ) THEN
    CREATE POLICY channel_pnl_settings_delete_org ON public.channel_pnl_settings FOR DELETE
      USING (org_id IN (SELECT org_id FROM public.profiles WHERE id = auth.uid()));
  END IF;
END $$;
