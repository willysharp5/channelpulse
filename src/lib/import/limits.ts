/** Max rows sent in one import request (orders, products, or inventory). */
export const MAX_CSV_IMPORT_ROWS_PER_REQUEST = 500;

export function exceedsImportRowLimit(rowCount: number): boolean {
  return rowCount > MAX_CSV_IMPORT_ROWS_PER_REQUEST;
}

export function importRowLimitMessage(rowCount: number): string {
  return `This import has ${rowCount} rows. You can import at most ${MAX_CSV_IMPORT_ROWS_PER_REQUEST} rows at a time. Turn on “Skip invalid rows”, split your CSV into smaller files, or remove rows, then try again.`;
}
