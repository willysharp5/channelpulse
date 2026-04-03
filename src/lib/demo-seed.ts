/**
 * Identifies demo channels created by `npm run seed:demo` (four non-Shopify samples; real Shopify is never tagged).
 * Real integrations must not set `metadata.seed_demo`.
 *
 * @see scripts/seed-demo-channels.cjs
 */
export const DEMO_CHANNEL_BUNDLE_ID = "stress_test_v1" as const;
