-- Per-store optional shipping / payment processing % (null = org default from cost_settings)
ALTER TABLE public.channel_pnl_settings
  ADD COLUMN IF NOT EXISTS shipping_cost_percent double precision,
  ADD COLUMN IF NOT EXISTS payment_processing_percent double precision;
