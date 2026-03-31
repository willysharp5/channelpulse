import numeral from "numeral";
import { format, formatDistanceToNow, parseISO } from "date-fns";

export function formatCurrency(value: number, currency = "USD"): string {
  if (Math.abs(value) >= 1_000_000) {
    return numeral(value).format("$0.0a");
  }
  return numeral(value).format("$0,0.00");
}

export function formatCompactCurrency(value: number): string {
  if (Math.abs(value) >= 1_000_000) return numeral(value).format("$0.0a");
  if (Math.abs(value) >= 1_000) return numeral(value).format("$0.0a");
  return numeral(value).format("$0,0");
}

export function formatNumber(value: number): string {
  return numeral(value).format("0,0");
}

export function formatCompactNumber(value: number): string {
  if (Math.abs(value) >= 1_000_000) return numeral(value).format("0.0a");
  if (Math.abs(value) >= 1_000) return numeral(value).format("0.0a");
  return numeral(value).format("0,0");
}

export function formatPercent(value: number): string {
  const sign = value > 0 ? "+" : "";
  return `${sign}${numeral(value / 100).format("0.0%")}`;
}

export function formatDate(dateStr: string, formatStr = "MMM d, yyyy"): string {
  return format(parseISO(dateStr), formatStr);
}

export function formatRelativeDate(dateStr: string): string {
  return formatDistanceToNow(parseISO(dateStr), { addSuffix: true });
}

export function formatShortDate(dateStr: string): string {
  return format(parseISO(dateStr), "MMM d");
}
