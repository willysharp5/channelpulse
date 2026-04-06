"use client";

import { useCallback, useState } from "react";
import { Upload } from "lucide-react";
import { cn } from "@/lib/utils";

export function CsvDropzone({
  onFileText,
  disabled,
}: {
  onFileText: (text: string, fileName: string) => void;
  disabled?: boolean;
}) {
  const [drag, setDrag] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFile = useCallback(
    (file: File | null) => {
      setError(null);
      if (!file) return;
      if (!file.name.toLowerCase().endsWith(".csv")) {
        setError("Please upload a .csv file.");
        return;
      }
      const reader = new FileReader();
      reader.onload = () => {
        const text = typeof reader.result === "string" ? reader.result : "";
        if (!text.trim()) {
          setError("File is empty.");
          return;
        }
        onFileText(text, file.name);
      };
      reader.onerror = () => setError("Could not read file.");
      reader.readAsText(file, "UTF-8");
    },
    [onFileText]
  );

  return (
    <div className="space-y-2">
      <label
        className={cn(
          "flex min-h-[100px] cursor-pointer flex-col items-center justify-center rounded-lg border-2 border-dashed p-4 text-center transition-colors sm:min-h-[110px]",
          drag ? "border-primary bg-primary/5" : "border-muted-foreground/25 hover:border-muted-foreground/50",
          disabled && "pointer-events-none opacity-50"
        )}
        onDragOver={(e) => {
          e.preventDefault();
          setDrag(true);
        }}
        onDragLeave={() => setDrag(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDrag(false);
          const f = e.dataTransfer.files[0];
          handleFile(f ?? null);
        }}
      >
        <Upload className="mb-1 size-6 text-muted-foreground" />
        <span className="text-xs font-medium">Drop CSV or click to browse</span>
        <span className="mt-0.5 text-[11px] text-muted-foreground">.csv · parsed in browser</span>
        <input
          type="file"
          accept=".csv,text/csv"
          className="sr-only"
          disabled={disabled}
          onChange={(e) => handleFile(e.target.files?.[0] ?? null)}
        />
      </label>
      {error ? <p className="text-sm text-destructive">{error}</p> : null}
    </div>
  );
}
