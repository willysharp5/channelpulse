/**
 * Shared formatting and search text for admin audit log (server filter + table display).
 */

const AUDIT_ACTION_LABELS: Record<string, string> = {
  impersonate_start: "Impersonated",
  impersonate_end: "Impersonate End",
  ban_user: "Ban User",
  unban_user: "Unban User",
  change_plan: "Change Plan",
  update_plan: "Update Plan",
  manual_sync: "Manual Sync",
  dashboard_tour_flag: "Dashboard Tour",
};

function humanizeActionSlug(slug: string): string {
  return slug
    .split("_")
    .filter(Boolean)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
}

/** Label for filter dropdown and trigger (never raw snake_case). */
export function formatAuditActionFilterLabel(action: string | null | undefined): string {
  const slug = action != null && String(action).length > 0 ? String(action) : "all";
  if (slug === "all") return "All Actions";
  return AUDIT_ACTION_LABELS[slug] ?? humanizeActionSlug(slug);
}

function capitalize(s: string): string {
  return s.charAt(0).toUpperCase() + s.slice(1);
}

/** Human-readable details line (matches the audit log table). */
export function formatAuditDetails(action: string, details: Record<string, unknown>): string {
  if (Object.keys(details).length === 0) return "—";

  switch (action) {
    case "change_plan": {
      const from = details.from as string | undefined;
      const to = details.to as string | undefined;
      if (from && to) return `${capitalize(from)} → ${capitalize(to)}`;
      return to ? `Changed to ${capitalize(to)}` : "Plan changed";
    }
    case "ban_user":
      return details.reason ? `Reason: ${details.reason}` : "No reason given";
    case "update_plan": {
      const plan = details.plan as string | undefined;
      const changes = details.changes as Record<string, unknown> | undefined;
      const parts: string[] = [];
      if (plan) parts.push(capitalize(plan));
      if (changes) {
        const keys = Object.keys(changes);
        if (keys.length > 0) parts.push(keys.map((k) => k.replace(/_/g, " ")).join(", "));
      }
      return parts.length > 0 ? parts.join(" — ") : "Plan updated";
    }
    case "manual_sync":
      return details.channel ? `Channel: ${details.channel}` : "Manual sync triggered";
    case "dashboard_tour_flag": {
      const seen = details.has_seen_dashboard_tour;
      if (typeof seen === "boolean") return seen ? "Marked complete" : "Reset (show tour)";
      return "Tour flag updated";
    }
    default: {
      const entries = Object.entries(details);
      if (entries.length <= 2) {
        return entries.map(([k, v]) => `${k.replace(/_/g, " ")}: ${v}`).join(", ");
      }
      return `${entries.length} fields`;
    }
  }
}

function flattenDetailValues(obj: unknown, out: string[]): void {
  if (obj === null || obj === undefined) return;
  if (typeof obj === "string" || typeof obj === "number" || typeof obj === "boolean") {
    out.push(String(obj));
    return;
  }
  if (Array.isArray(obj)) {
    for (const x of obj) flattenDetailValues(x, out);
    return;
  }
  if (typeof obj === "object") {
    for (const v of Object.values(obj as Record<string, unknown>)) flattenDetailValues(v, out);
  }
}

/**
 * Lowercased string covering action slug, UI action name, formatted details, JSON, and all primitive values in `details`
 * so whole-word searches (e.g. "reset", "growth") match what users see in the table, not only raw JSON keys.
 */
export function auditEntrySearchHaystack(action: string, details: Record<string, unknown>): string {
  const label = AUDIT_ACTION_LABELS[action] ?? action.replace(/_/g, " ");
  const formatted = formatAuditDetails(action, details);
  const flat: string[] = [];
  flattenDetailValues(details, flat);
  let json = "";
  try {
    json = JSON.stringify(details);
  } catch {
    json = "";
  }
  return [action, label, formatted, json, ...flat].join(" ").toLowerCase();
}
