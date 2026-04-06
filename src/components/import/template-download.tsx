"use client";

import { Download } from "lucide-react";
import { Button } from "@/components/ui/button";
import { buildTemplateCsv, templateFilename, type ImportType } from "@/lib/import/templates";

export function downloadImportTemplate(importType: ImportType) {
  const csv = buildTemplateCsv(importType);
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = templateFilename(importType);
  a.click();
  URL.revokeObjectURL(url);
}

export function TemplateDownload({ importType }: { importType: ImportType }) {
  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      className="gap-2"
      onClick={() => downloadImportTemplate(importType)}
    >
      <Download className="size-4" />
      Download template
    </Button>
  );
}
