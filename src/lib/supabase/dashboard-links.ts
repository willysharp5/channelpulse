/**
 * Build links to the Supabase Dashboard for the project behind NEXT_PUBLIC_SUPABASE_URL.
 * Project ref is the subdomain of *.supabase.co (same ref the dashboard uses in URLs).
 */

export function getSupabaseProjectRefFromUrl(url: string | undefined | null): string | null {
  if (!url?.trim()) return null;
  try {
    const host = new URL(url.trim()).hostname.toLowerCase();
    const m = host.match(/^([a-z0-9-]+)\.supabase\.co$/);
    return m?.[1] ?? null;
  } catch {
    return null;
  }
}

export function supabaseDashboardBase(ref: string): string {
  return `https://supabase.com/dashboard/project/${ref}`;
}

export function supabaseTableEditorUrl(ref: string): string {
  return `${supabaseDashboardBase(ref)}/editor`;
}

export function supabaseSqlNewUrl(ref: string): string {
  return `${supabaseDashboardBase(ref)}/sql/new`;
}

export function supabaseDatabaseTablesUrl(ref: string): string {
  return `${supabaseDashboardBase(ref)}/database/tables`;
}

export function supabaseTableUrl(ref: string, table: string, schema = "public"): string {
  return `${supabaseDashboardBase(ref)}/editor?schema=${schema}&table=${table}`;
}
