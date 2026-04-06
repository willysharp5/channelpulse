-- Optional reorder point for inventory CSV imports and future low-stock rules
ALTER TABLE public.products ADD COLUMN IF NOT EXISTS reorder_point integer;
