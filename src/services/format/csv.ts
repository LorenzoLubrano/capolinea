/** Spreadsheets run a cell that starts with these as a formula (CSV injection). */
const FORMULA_START = /^[=+\-@\t\r]/;
const NEEDS_QUOTES = /[;"\r\n]|^\s|\s$/;

/**
 * One text cell for a CSV opened by Excel or Numbers in Italian: a leading apostrophe defuses
 * formulas, quotes protect separators and line breaks.
 */
export function csvCell(value: string): string {
  const safe = FORMULA_START.test(value) ? `'${value}` : value;
  return NEEDS_QUOTES.test(safe) ? `"${safe.replace(/"/g, '""')}"` : safe;
}

/** Cents as a number a spreadsheet in Italian reads: `-1284,62`, no grouping. */
export function csvAmount(minor: number): string {
  const sign = minor < 0 ? '-' : '';
  const abs = Math.abs(minor);
  return `${sign}${Math.floor(abs / 100)},${String(abs % 100).padStart(2, '0')}`;
}

/** Semicolons: in Italian the comma is the decimal separator. Cells must already be escaped. */
export function csvLine(cells: string[]): string {
  return cells.join(';');
}
