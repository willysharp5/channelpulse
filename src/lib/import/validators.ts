import type { ImportType } from "./templates";
import { fieldsForType } from "./templates";

/** Map common labels to canonical slug for validation */
export function normalizePlatformInput(raw: string): string | null {
  const t = raw.trim().toLowerCase();
  if (!t) return null;
  const compact = t.replace(/[\s_\-]+/g, "");
  if (compact === "woo" || compact === "woocommerce") return "woocommerce";
  if (compact === "tiktok" || compact === "tiktokshop" || compact === "tiktok_shop") return "tiktok";
  if (["shopify", "amazon", "etsy"].includes(compact)) return compact;
  return null;
}

export function isAllowedPlatformValue(raw: string): boolean {
  return normalizePlatformInput(raw) !== null;
}

function parseNumberLoose(s: string): number | null {
  const t = s.trim().replace(/[$€£,]/g, "");
  if (t === "") return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

function parseIntegerLoose(s: string): number | null {
  const n = parseNumberLoose(s);
  if (n === null) return null;
  if (!Number.isInteger(n) && Math.abs(n - Math.round(n)) > 1e-9) return null;
  return Math.round(n);
}

function parseDateLoose(s: string): Date | null {
  const t = s.trim();
  if (!t) return null;
  const d = new Date(t);
  return Number.isNaN(d.getTime()) ? null : d;
}

export interface RowValidationResult {
  valid: boolean;
  errors: string[];
}

export function validateMappedRow(
  type: ImportType,
  row: Record<string, string>
): RowValidationResult {
  const fields = fieldsForType(type);
  const errors: string[] = [];

  for (const f of fields) {
    const val = row[f.key]?.trim() ?? "";
    if (f.required && !val) {
      errors.push(`Missing ${f.label}`);
      continue;
    }
    if (!val) continue;

    switch (f.type) {
      case "number": {
        const n = parseNumberLoose(val);
        if (n === null) errors.push(`${f.label} must be a number`);
        break;
      }
      case "integer": {
        const n = parseIntegerLoose(val);
        if (n === null) errors.push(`${f.label} must be a whole number`);
        break;
      }
      case "date": {
        if (!parseDateLoose(val)) errors.push(`${f.label} must be a valid date`);
        break;
      }
      case "platform": {
        if (!isAllowedPlatformValue(val)) {
          errors.push(`${f.label} must be a supported platform (Shopify, Amazon, Etsy, TikTok Shop, WooCommerce)`);
        }
        break;
      }
      default:
        break;
    }
  }

  return { valid: errors.length === 0, errors };
}

export function validateAllRows(
  type: ImportType,
  rows: Record<string, string>[]
): RowValidationResult[] {
  return rows.map((r) => validateMappedRow(type, r));
}
