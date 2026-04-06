import type { ImportType } from "./templates";

const KNOWN_TYPES = new Set<string>(["orders", "products", "inventory"]);

function importKindNoun(t: ImportType): string {
  switch (t) {
    case "orders":
      return "orders";
    case "products":
      return "products";
    case "inventory":
      return "inventory";
    default:
      return "rows";
  }
}

function normalizeImportType(raw: string): ImportType {
  return KNOWN_TYPES.has(raw) ? (raw as ImportType) : "orders";
}

/**
 * Human-readable explanation of an import job — same semantics as the post-import toast
 * (new vs updated rows, skips). Use in admin history and detail so users can audit later.
 */
export function describeImportJobOutcome(args: {
  status: string;
  importType: string;
  imported: number;
  skipped: number;
  insertedNew: number;
  updatedExisting: number;
  channelName: string;
  errorMessage?: string | null;
}): string {
  const importType = normalizeImportType(args.importType);
  const kind = importKindNoun(importType);

  if (args.status === "failed") {
    const err = (args.errorMessage ?? "").trim();
    return err.length > 280 ? `${err.slice(0, 280)}…` : err || "Import failed.";
  }
  if (args.status === "queued") {
    return "Waiting in queue — not started yet.";
  }
  if (args.status === "running") {
    return "Still processing — rows not finalized yet.";
  }
  if (args.status !== "completed") {
    return "—";
  }

  const { imported, skipped, insertedNew, updatedExisting, channelName } = args;
  const skipPart =
    skipped > 0
      ? ` ${skipped} row${skipped === 1 ? " was" : "s were"} skipped because of a problem in the file.`
      : "";
  const idPhrase = importType === "orders" ? "order IDs" : "SKUs";
  const legacyCounts = imported > 0 && insertedNew === 0 && updatedExisting === 0;
  const breakdownOk =
    !legacyCounts && imported > 0 && insertedNew + updatedExisting === imported;

  if (imported === 0 && skipped > 0) {
    return `Nothing new was saved for ${channelName}. ${skipped} row${skipped === 1 ? "" : "s"} could not be imported — check the file and try again.`;
  }
  if (imported === 0 && skipped === 0) {
    return `Nothing new was added for ${channelName}. Those items may already be in ChannelPulse.`;
  }
  if (imported > 0 && !breakdownOk) {
    return `We processed ${imported} row${imported === 1 ? "" : "s"} for ${channelName}.${skipPart}`.trim();
  }
  if (insertedNew === 0 && updatedExisting > 0) {
    return (
      `All ${updatedExisting} valid row${updatedExisting === 1 ? "" : "s"} matched existing ${idPhrase} for ${channelName}. ` +
      `No duplicate records were added; we refreshed those rows in place.${skipPart}`
    ).trim();
  }
  if (insertedNew > 0 && updatedExisting === 0) {
    return `We added ${insertedNew} new ${kind} to ${channelName}.${skipPart}`.trim();
  }
  return (
    `Saved ${imported} row${imported === 1 ? "" : "s"} for ${channelName}: ${insertedNew} new, ${updatedExisting} updated ` +
    `(same ${idPhrase} as records already in ChannelPulse).${skipPart}`
  ).trim();
}

/** True when the DB row has saved rows but no new/updated breakdown (0 / 0). */
export function legacyImportUpsertCountsOnly(
  imported: number,
  insertedNew: number,
  updatedExisting: number
): boolean {
  return imported > 0 && insertedNew === 0 && updatedExisting === 0;
}

/**
 * Completed job with no stored `outcome_summary` and no upsert breakdown — toast can still show the full server line.
 * Show a short admin hint to run migrations so the sheet matches future jobs.
 */
export function shouldShowImportOutcomeMigrationHint(args: {
  status: string;
  imported: number;
  skipped: number;
  insertedNew: number;
  updatedExisting: number;
  hasStoredOutcomeSummary: boolean;
}): boolean {
  if (args.status !== "completed") return false;
  if (args.hasStoredOutcomeSummary) return false;
  if (args.imported <= 0 || args.skipped > 0) return false;
  return legacyImportUpsertCountsOnly(args.imported, args.insertedNew, args.updatedExisting);
}
