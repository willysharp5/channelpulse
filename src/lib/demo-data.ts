/**
 * Fixed org used for the public read-only /demo dashboard.
 * Run `npm run seed:public-demo` (with service role in .env.local) to populate Supabase.
 */
export const DEMO_ORG_ID = "c0ffee00-0000-4000-8000-00000000d3b0";

/** Tags demo channels/products/orders for safe cleanup by the seed script. */
export const PUBLIC_DEMO_BUNDLE = "public_site_demo_v1";

export function isPublicDemoOrg(orgId: string | null | undefined): boolean {
  return orgId === DEMO_ORG_ID;
}
