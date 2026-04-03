-- Allow additional marketplace platforms (matches app Platform type + seed script).
ALTER TABLE public.channels DROP CONSTRAINT IF EXISTS channels_platform_check;

ALTER TABLE public.channels ADD CONSTRAINT channels_platform_check CHECK (
  platform IN (
    'shopify',
    'amazon',
    'ebay',
    'etsy',
    'woocommerce',
    'tiktok',
    'walmart',
    'facebook',
    'instagram',
    'pinterest',
    'google',
    'bigcommerce',
    'square',
    'temu',
    'magento',
    'mirakl'
  )
);
