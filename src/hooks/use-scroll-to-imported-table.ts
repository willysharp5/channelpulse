"use client";

import { useLayoutEffect } from "react";

/** Scroll target for file-import filtered lists (orders / products / inventory). */
export const IMPORTED_DATA_TABLE_ID = "imported-data-table";

/** After navigating or toggling to `source=csv`, bring the data table into view. */
export function useScrollToImportedTableWhenFiltered(sourceFromUrl: string) {
  useLayoutEffect(() => {
    if (sourceFromUrl !== "csv") return;
    const el = document.getElementById(IMPORTED_DATA_TABLE_ID);
    if (!el) return;
    el.scrollIntoView({ behavior: "smooth", block: "start" });
  }, [sourceFromUrl]);
}
