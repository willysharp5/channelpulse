import type { TemplateField } from "./templates";

/** Lowercase, remove spaces/underscores/hyphens for fuzzy compare */
export function normalizeHeader(s: string): string {
  return s
    .toLowerCase()
    .replace(/[\s_\-./]+/g, "")
    .replace(/[^a-z0-9]/g, "");
}

function fieldMatchKeys(field: TemplateField): Set<string> {
  const keys = new Set<string>();
  keys.add(normalizeHeader(field.key));
  keys.add(normalizeHeader(field.label));
  for (const syn of field.synonyms ?? []) {
    keys.add(normalizeHeader(syn));
  }
  return keys;
}

/**
 * For each CSV header index, pick best matching field key or null (skip).
 */
export function suggestColumnMapping(
  csvHeaders: string[],
  fields: TemplateField[]
): (string | null)[] {
  const fieldByNorm = new Map<string, string>();
  for (const f of fields) {
    for (const k of fieldMatchKeys(f)) {
      if (k && !fieldByNorm.has(k)) fieldByNorm.set(k, f.key);
    }
  }

  const taken = new Set<string>();
  return csvHeaders.map((h) => {
    const n = normalizeHeader(h);
    if (!n) return null;
    const tryAssign = (key: string | null) => {
      if (!key || taken.has(key)) return null;
      taken.add(key);
      return key;
    };

    const direct = fieldByNorm.get(n);
    if (direct) {
      const a = tryAssign(direct);
      if (a) return a;
    }
    for (const f of fields) {
      for (const k of fieldMatchKeys(f)) {
        if (k.length >= 3 && (n.includes(k) || k.includes(n))) {
          const a = tryAssign(f.key);
          if (a) return a;
        }
      }
    }
    return null;
  });
}

export type ColumnMapping = Record<string, string | null>;

/** csvHeader -> target field key | null */
export function mappingArrayToRecord(
  csvHeaders: string[],
  targets: (string | null)[]
): ColumnMapping {
  const m: ColumnMapping = {};
  csvHeaders.forEach((h, i) => {
    m[h] = targets[i] ?? null;
  });
  return m;
}

/** Apply mapping: one object per row with canonical keys */
export function applyMapping(
  rows: Record<string, string>[],
  csvHeaders: string[],
  mapping: ColumnMapping
): Record<string, string>[] {
  return rows.map((row) => {
    const out: Record<string, string> = {};
    for (const h of csvHeaders) {
      const target = mapping[h];
      if (target && row[h] !== undefined && row[h] !== "") {
        out[target] = row[h];
      }
    }
    return out;
  });
}
