"use client";

import { Button } from "@/components/ui/button";

export type ImportedFilterEntity = "orders" | "products" | "inventory";

const HEADLINE: Record<ImportedFilterEntity, string> = {
  orders: "Imported orders only",
  products: "Imported products only",
  inventory: "Imported stock only",
};

export function ImportedDataFilterBanner({
  entity,
  onShowAll,
}: {
  entity: ImportedFilterEntity;
  onShowAll: () => void;
}) {
  return (
    <div
      className="flex flex-wrap items-center justify-between gap-2 border-b-2 border-emerald-600/45 bg-emerald-600/[0.14] px-3 py-2.5 dark:border-emerald-500/50 dark:bg-emerald-500/[0.18]"
      role="status"
    >
      <p className="text-sm font-bold tracking-tight text-foreground">{HEADLINE[entity]}</p>
      <Button type="button" variant="secondary" size="sm" className="h-8 shrink-0 text-xs font-semibold" onClick={onShowAll}>
        Show all records
      </Button>
    </div>
  );
}
