"use client";

import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { fieldsForType, type ImportType } from "@/lib/import/templates";
import type { ColumnMapping } from "@/lib/import/mapper";

export function ColumnMapper({
  importType,
  csvHeaders,
  mapping,
  onChange,
}: {
  importType: ImportType;
  csvHeaders: string[];
  mapping: ColumnMapping;
  onChange: (next: ColumnMapping) => void;
}) {
  const fields = fieldsForType(importType);
  const fieldKeys = fields.map((f) => f.key);
  const used = new Set(
    Object.entries(mapping)
      .filter(([, v]) => v !== null && v !== "")
      .map(([, v]) => v as string)
  );

  function setHeaderTarget(header: string, value: string) {
    const next = { ...mapping };
    if (value === "__skip__") next[header] = null;
    else next[header] = value;
    onChange(next);
  }

  function fieldLabel(key: string): string {
    const f = fields.find((x) => x.key === key);
    return f?.label ?? key;
  }

  return (
    <div className="space-y-3">
      <p className="text-xs text-muted-foreground">Map columns; unmapped are skipped.</p>
      <div className="max-h-[240px] space-y-1.5 overflow-y-auto rounded-md border p-2 sm:p-2.5">
        {csvHeaders.map((h) => {
          const current = mapping[h] ?? null;
          const selectValue = current ?? "__skip__";
          return (
            <div key={h} className="grid gap-2 sm:grid-cols-[1fr,200px] sm:items-center">
              <div className="min-w-0">
                <Label className="text-xs text-muted-foreground">File column</Label>
                <p className="truncate font-mono text-sm font-medium" title={h}>
                  {h || "(empty)"}
                </p>
              </div>
              <Select
                value={selectValue}
                onValueChange={(v: string | null) => setHeaderTarget(h, v ?? "__skip__")}
              >
                <SelectTrigger className="h-9 w-full bg-background">
                  <SelectValue placeholder="Map to…" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="__skip__">Skip</SelectItem>
                  {fieldKeys.map((key) => {
                    const taken = used.has(key) && mapping[h] !== key;
                    return (
                      <SelectItem key={key} value={key} disabled={taken}>
                        {fieldLabel(key)}
                        {fields.find((f) => f.key === key)?.required ? " *" : ""}
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>
          );
        })}
      </div>
    </div>
  );
}
