const YMD_RE = /^(\d{4})-(\d{2})-(\d{2})$/;

/** Validates calendar YYYY-MM-DD; returns the string or null. */
export function parseDateYmd(raw: string | undefined | null): string | null {
  if (!raw || !YMD_RE.test(raw.trim())) return null;
  const s = raw.trim();
  const y = Number(s.slice(0, 4));
  const m = Number(s.slice(5, 7));
  const d = Number(s.slice(8, 10));
  if (m < 1 || m > 12 || d < 1 || d > 31) return null;
  const dt = new Date(Date.UTC(y, m - 1, d));
  if (dt.getUTCFullYear() !== y || dt.getUTCMonth() !== m - 1 || dt.getUTCDate() !== d) return null;
  return s;
}

export function normalizeDateRangeYmd(from: string | null, to: string | null): { fromY: string | null; toY: string | null } {
  let fromY = from;
  let toY = to;
  if (fromY && toY && fromY > toY) {
    const t = fromY;
    fromY = toY;
    toY = t;
  }
  return { fromY, toY };
}
