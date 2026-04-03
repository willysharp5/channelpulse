import { DATE_RANGE_PRESETS, rangeToDays } from "@/lib/constants";
import { getDateRange } from "@/lib/date-range-bounds";
import { normalizeDateRangeYmd, parseDateYmd } from "@/lib/date-ymd";

const PRESET_VALUES = new Set<string>(DATE_RANGE_PRESETS.map((p) => p.value));

function firstParam(sp: Record<string, string | string[] | undefined>, k: string): string | undefined {
  const v = sp[k];
  return Array.isArray(v) ? v[0] : v;
}

export interface TableDateRangeParams {
  /** Dashboard preset (e.g. 7d); null when all time or custom */
  range: string | null;
  dateFrom: string | null;
  dateTo: string | null;
}

/** Parse `range` / `from`+`to` / legacy `date` (7|30|90) from URL. */
export function parseTableDateRangeSearchParams(
  sp: Record<string, string | string[] | undefined>
): TableDateRangeParams {
  const dateFrom = parseDateYmd(firstParam(sp, "from"));
  const dateTo = parseDateYmd(firstParam(sp, "to"));
  if (dateFrom && dateTo) {
    return { range: null, dateFrom, dateTo };
  }
  const rangeRaw = firstParam(sp, "range");
  if (rangeRaw && PRESET_VALUES.has(rangeRaw)) {
    return { range: rangeRaw, dateFrom: null, dateTo: null };
  }
  const d = firstParam(sp, "date");
  if (d === "7" || d === "30" || d === "90") {
    const range = d === "7" ? "7d" : d === "30" ? "30d" : "90d";
    return { range, dateFrom: null, dateTo: null };
  }
  return { range: null, dateFrom: null, dateTo: null };
}

/** Inclusive UTC day bounds for DB filters (orders ordered_at, inventory updated_at). */
export function tableDateRangeBounds(
  range: string | null,
  dateFrom: string | null,
  dateTo: string | null
): { since: string | null; until: string | null } {
  const { fromY, toY } = normalizeDateRangeYmd(dateFrom, dateTo);
  if (fromY && toY) {
    return {
      since: `${fromY}T00:00:00.000Z`,
      until: `${toY}T23:59:59.999Z`,
    };
  }
  if (range) {
    const { fromStr, toStr } = getDateRange({ days: rangeToDays(range) });
    return {
      since: `${fromStr}T00:00:00.000Z`,
      until: `${toStr}T23:59:59.999Z`,
    };
  }
  return { since: null, until: null };
}

export function isTableDateRangeActive(params: TableDateRangeParams): boolean {
  return params.range !== null || (!!params.dateFrom && !!params.dateTo);
}
