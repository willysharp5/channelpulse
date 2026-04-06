/**
 * Minimal RFC-style CSV parser (quoted fields, commas). Under ~100 lines, no deps.
 */

export interface ParsedCsv {
  headers: string[];
  rows: Record<string, string>[];
}

function parseLine(line: string): string[] {
  const out: string[] = [];
  let cur = "";
  let i = 0;
  let inQuotes = false;
  while (i < line.length) {
    const c = line[i];
    if (inQuotes) {
      if (c === '"') {
        if (line[i + 1] === '"') {
          cur += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i++;
        continue;
      }
      cur += c;
      i++;
      continue;
    }
    if (c === '"') {
      inQuotes = true;
      i++;
      continue;
    }
    if (c === ",") {
      out.push(cur);
      cur = "";
      i++;
      continue;
    }
    cur += c;
    i++;
  }
  out.push(cur);
  return out;
}

function splitRows(text: string): string[] {
  const rows: string[] = [];
  let cur = "";
  let inQuotes = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i];
    if (c === '"') {
      inQuotes = !inQuotes;
      cur += c;
      continue;
    }
    if (!inQuotes && (c === "\n" || (c === "\r" && text[i + 1] === "\n"))) {
      if (c === "\r") i++;
      const trimmed = cur.replace(/\r$/, "");
      if (trimmed.length > 0 || rows.length === 0) rows.push(trimmed);
      cur = "";
      continue;
    }
    if (!inQuotes && c === "\r") {
      const trimmed = cur.replace(/\r$/, "");
      if (trimmed.length > 0 || rows.length === 0) rows.push(trimmed);
      cur = "";
      continue;
    }
    cur += c;
  }
  if (cur.length > 0 || rows.length === 0) rows.push(cur);
  return rows.filter((r) => r.trim().length > 0);
}

export function parseCsv(text: string): ParsedCsv {
  const normalized = text.replace(/^\uFEFF/, "");
  const rawRows = splitRows(normalized);
  if (rawRows.length === 0) {
    return { headers: [], rows: [] };
  }
  const headers = parseLine(rawRows[0]).map((h) => h.trim());
  const rows: Record<string, string>[] = [];
  for (let r = 1; r < rawRows.length; r++) {
    const cells = parseLine(rawRows[r]);
    const row: Record<string, string> = {};
    for (let c = 0; c < headers.length; c++) {
      const key = headers[c] || `column_${c}`;
      row[key] = (cells[c] ?? "").trim();
    }
    rows.push(row);
  }
  return { headers, rows };
}
