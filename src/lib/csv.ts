import Papa from 'papaparse';
import type { Spectrum } from './types';

export interface ParsedSpectrumCsv {
  spectrum: Spectrum | null;
  errors: string[];
}

/**
 * Parses a two-column numeric spectrum CSV (x, y) with a plain-language
 * error for every problem row instead of a raw parser crash. An optional
 * single header row (non-numeric first row) is detected and skipped.
 */
export function parseSpectrumCsv(csvText: string): ParsedSpectrumCsv {
  const result = Papa.parse<string[]>(csvText, {
    skipEmptyLines: true,
  });

  // Papa still populates result.data for rows it flags (e.g. a short row
  // with a field-count mismatch), so per-row validation below reports a
  // plain-language error for those rows instead of surfacing Papa's own
  // internal parser messages.
  let rows = result.data;
  if (rows.length === 0) {
    return { spectrum: null, errors: ['The file has no data rows.'] };
  }

  // Skip a header row if its cells are not both numeric.
  const looksLikeHeader = rows[0].length >= 2 && (!isFiniteNumber(rows[0][0]) || !isFiniteNumber(rows[0][1]));
  const headerOffset = looksLikeHeader ? 1 : 0;
  rows = rows.slice(headerOffset);

  if (rows.length === 0) {
    return { spectrum: null, errors: ['The file has a header but no data rows.'] };
  }

  const errors: string[] = [];
  const x: number[] = [];
  const y: number[] = [];

  rows.forEach((row, i) => {
    const csvRowNumber = i + 1 + headerOffset;
    const cells = row.filter((c) => c.trim() !== '');
    if (cells.length !== 2) {
      errors.push(`Row ${csvRowNumber}: expected 2 columns, found ${cells.length}.`);
      return;
    }
    const [rawX, rawY] = cells;
    if (!isFiniteNumber(rawX)) {
      errors.push(`Row ${csvRowNumber}, column 1 ("${rawX}") is not a number.`);
      return;
    }
    if (!isFiniteNumber(rawY)) {
      errors.push(`Row ${csvRowNumber}, column 2 ("${rawY}") is not a number.`);
      return;
    }
    x.push(Number(rawX));
    y.push(Number(rawY));
  });

  if (errors.length > 0) {
    return { spectrum: null, errors };
  }

  return { spectrum: { x, y }, errors: [] };
}

export function readFileAsText(file: File): Promise<string> {
  return file.text();
}

function isFiniteNumber(raw: string): boolean {
  const n = Number(raw.trim());
  return raw.trim() !== '' && Number.isFinite(n);
}
