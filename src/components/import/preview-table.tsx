"use client";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import type { ImportType } from "@/lib/import/templates";
import { fieldsForType } from "@/lib/import/templates";

export function PreviewTable({
  importType,
  headers,
  rows,
  rowErrors,
  maxRows = 8,
}: {
  importType: ImportType;
  headers: string[];
  rows: Record<string, string>[];
  rowErrors: string[][];
  maxRows?: number;
}) {
  const fields = fieldsForType(importType);
  const keys = fields.map((f) => f.key).filter((k) => headers.includes(k));
  const displayKeys = keys.length > 0 ? keys : headers;
  const slice = rows.slice(0, maxRows);

  return (
    <div className="space-y-2">
      <p className="text-xs text-muted-foreground">
        First {Math.min(maxRows, rows.length)} of {rows.length} rows
      </p>
      <div className="rounded-md border overflow-x-auto">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">#</TableHead>
              {displayKeys.map((k) => (
                <TableHead key={k} className="whitespace-nowrap">
                  {k}
                </TableHead>
              ))}
              <TableHead>Issues</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {slice.map((row, i) => {
              const errs = rowErrors[i] ?? [];
              const bad = errs.length > 0;
              return (
                <TableRow key={i} className={cn(bad && "bg-destructive/5")}>
                  <TableCell className="text-muted-foreground">{i + 1}</TableCell>
                  {displayKeys.map((k) => (
                    <TableCell key={k} className="max-w-[200px] truncate font-mono text-xs" title={row[k]}>
                      {row[k] ?? "—"}
                    </TableCell>
                  ))}
                  <TableCell className="text-xs text-destructive">
                    {bad ? errs.join("; ") : "—"}
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
