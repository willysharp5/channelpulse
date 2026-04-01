"use client";

import { useState, useRef } from "react";
import { Upload, Download, Loader2, CheckCircle2, AlertCircle } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";

interface Product {
  id: string;
  title: string;
  sku: string | null;
  cogs: number | null;
}

interface CogsImportProps {
  products: Product[];
}

interface ImportResult {
  success: boolean;
  updated?: number;
  errors?: string[];
}

function parseCSV(text: string): Array<Record<string, string>> {
  const lines = text.trim().split("\n");
  if (lines.length < 2) return [];

  const headers = lines[0].split(",").map((h) => h.trim().toLowerCase().replace(/['"]/g, ""));
  const rows: Array<Record<string, string>> = [];

  for (let i = 1; i < lines.length; i++) {
    const values = lines[i].split(",").map((v) => v.trim().replace(/['"]/g, ""));
    const row: Record<string, string> = {};
    headers.forEach((h, idx) => {
      row[h] = values[idx] ?? "";
    });
    rows.push(row);
  }

  return rows;
}

export function CogsImport({ products }: CogsImportProps) {
  const [open, setOpen] = useState(false);
  const [importing, setImporting] = useState(false);
  const [result, setResult] = useState<ImportResult | null>(null);
  const fileRef = useRef<HTMLInputElement>(null);

  function handleDownloadTemplate() {
    const header = "sku,title,cogs\n";
    const rows = products
      .map((p) => `"${p.sku ?? ""}","${p.title.replace(/"/g, '""')}",${Number(p.cogs ?? 0).toFixed(2)}`)
      .join("\n");

    const blob = new Blob([header + rows], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "channelpulse-cogs.csv";
    a.click();
    URL.revokeObjectURL(url);
  }

  async function handleFileUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setImporting(true);
    setResult(null);

    try {
      const text = await file.text();
      const rows = parseCSV(text);

      if (rows.length === 0) {
        setResult({ success: false, errors: ["CSV is empty or has no data rows."] });
        return;
      }

      const updates = rows.map((row) => ({
        sku: row.sku || undefined,
        title: row.title || row.product || row.name || undefined,
        cogs: parseFloat(row.cogs ?? row.cost ?? row["cost of goods"] ?? "0"),
      })).filter((u) => (u.sku || u.title) && !isNaN(u.cogs));

      if (updates.length === 0) {
        setResult({ success: false, errors: ["No valid rows found. CSV must have 'sku' or 'title' column and 'cogs' column."] });
        return;
      }

      const res = await fetch("/api/products/cogs", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ updates }),
      });

      const data = await res.json();
      setResult({
        success: data.success,
        updated: data.updated,
        errors: data.errors,
      });
    } catch (err) {
      setResult({ success: false, errors: ["Failed to process CSV file."] });
    } finally {
      setImporting(false);
      if (fileRef.current) fileRef.current.value = "";
    }
  }

  return (
    <>
      <Button variant="outline" size="sm" className="gap-1.5" onClick={() => setOpen(true)}>
        <Upload className="h-3.5 w-3.5" /> Import COGS
      </Button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogHeader className="sr-only">
          <DialogTitle>Import COGS</DialogTitle>
          <DialogDescription>Upload cost of goods via CSV</DialogDescription>
        </DialogHeader>
        <DialogContent className="sm:max-w-md">
          <div className="space-y-4">
            <div>
              <h3 className="text-lg font-semibold">Import COGS (Cost of Goods Sold)</h3>
              <p className="text-sm text-muted-foreground mt-1">
                Upload a CSV file to set product costs in bulk. Match products by SKU or product title.
              </p>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Step 1: Download template</p>
              <p className="text-xs text-muted-foreground">
                Download a CSV with all your products pre-filled. Edit the &quot;cogs&quot; column with your actual costs.
              </p>
              <Button variant="outline" size="sm" className="gap-1.5" onClick={handleDownloadTemplate}>
                <Download className="h-3.5 w-3.5" /> Download CSV Template
              </Button>
            </div>

            <div className="rounded-lg border p-4 space-y-3">
              <p className="text-sm font-medium">Step 2: Upload edited CSV</p>
              <p className="text-xs text-muted-foreground">
                CSV must have columns: <code className="bg-muted px-1 rounded">sku</code> or <code className="bg-muted px-1 rounded">title</code>, and <code className="bg-muted px-1 rounded">cogs</code>. Products are matched by SKU first, then title.
              </p>
              <div className="flex items-center gap-2">
                <input
                  ref={fileRef}
                  type="file"
                  accept=".csv"
                  onChange={handleFileUpload}
                  className="text-sm file:mr-3 file:rounded-md file:border-0 file:bg-amber-500 file:px-3 file:py-1.5 file:text-sm file:font-medium file:text-white hover:file:bg-amber-600 file:cursor-pointer"
                  disabled={importing}
                />
                {importing && <Loader2 className="h-4 w-4 animate-spin" />}
              </div>
            </div>

            {result && (
              <div className={`rounded-lg border p-4 ${result.success ? "border-emerald-200 bg-emerald-50 dark:border-emerald-800 dark:bg-emerald-950" : "border-red-200 bg-red-50 dark:border-red-800 dark:bg-red-950"}`}>
                {result.success ? (
                  <div className="flex items-start gap-2">
                    <CheckCircle2 className="h-4 w-4 text-emerald-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-emerald-700 dark:text-emerald-300">
                        Updated {result.updated} product{result.updated !== 1 ? "s" : ""}
                      </p>
                      {result.errors && result.errors.length > 0 && (
                        <div className="mt-1 text-xs text-amber-600">
                          {result.errors.map((e, i) => <p key={i}>{e}</p>)}
                        </div>
                      )}
                      <p className="text-xs text-muted-foreground mt-1">Reload the page to see updated costs.</p>
                    </div>
                  </div>
                ) : (
                  <div className="flex items-start gap-2">
                    <AlertCircle className="h-4 w-4 text-red-600 mt-0.5 flex-shrink-0" />
                    <div>
                      <p className="text-sm font-medium text-red-700 dark:text-red-300">Import failed</p>
                      {result.errors?.map((e, i) => (
                        <p key={i} className="text-xs text-red-600 dark:text-red-400 mt-0.5">{e}</p>
                      ))}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
