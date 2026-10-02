import type { SpectralUnit } from './types';

/** One uploaded file: an x column plus one or more sample columns. */
export interface SpectrumTable {
  /** Header of the first column (may be a generated placeholder). */
  xHeader: string;
  /** x values (nm or cm⁻¹), ascending. */
  x: number[];
  samples: { name: string; values: number[] }[];
}

export interface ParsedTable {
  table: SpectrumTable | null;
  errors: string[];
}

/** Splits CSV text into rows of cells, handling quotes. Delimiter is auto-detected. */
export function splitCsv(text: string): string[][] {
  const clean = text.replace(/^﻿/, '');
  const firstLine = clean.split(/\r?\n/).find((l) => l.trim() !== '') ?? '';
  const candidates = [',', ';', '\t'];
  const delim = candidates
    .map((d) => ({ d, n: firstLine.split(d).length }))
    .sort((a, b) => b.n - a.n)[0].d;

  const rows: string[][] = [];
  let row: string[] = [];
  let cell = '';
  let quoted = false;
  for (let i = 0; i < clean.length; i++) {
    const ch = clean[i];
    if (quoted) {
      if (ch === '"') {
        if (clean[i + 1] === '"') {
          cell += '"';
          i++;
        } else quoted = false;
      } else cell += ch;
    } else if (ch === '"') {
      quoted = true;
    } else if (ch === delim) {
      row.push(cell);
      cell = '';
    } else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && clean[i + 1] === '\n') i++;
      row.push(cell);
      cell = '';
      if (row.some((c) => c.trim() !== '')) rows.push(row);
      row = [];
    } else cell += ch;
  }
  row.push(cell);
  if (row.some((c) => c.trim() !== '')) rows.push(row);
  return rows;
}

function num(raw: string | undefined): number | null {
  if (raw === undefined) return null;
  const t = raw.trim().replace(/,(?=\d{1,2}$)/, '.'); // tolerate a decimal comma
  if (t === '') return null;
  const n = Number(t);
  return Number.isFinite(n) ? n : null;
}

/**
 * Parses a spectrum file with one wavelength/wavenumber column followed by
 * one column per sample. A single header row is detected and used for the
 * sample names. Rows are returned sorted by x.
 */
export function parseSpectrumTable(text: string): ParsedTable {
  const rows = splitCsv(text);
  if (rows.length === 0) return { table: null, errors: ['The file has no data rows.'] };

  const width = Math.max(...rows.map((r) => r.length));
  if (width < 2) {
    return { table: null, errors: ['The file needs at least two columns: x values and one sample.'] };
  }

  const headerRow = num(rows[0][0]) === null ? rows[0] : null;
  const body = headerRow ? rows.slice(1) : rows;
  if (body.length === 0) return { table: null, errors: ['The file has a header but no data rows.'] };

  // A sample column counts only if it has numbers in most rows.
  const colHasData: boolean[] = [];
  for (let c = 1; c < width; c++) {
    const filled = body.filter((r) => num(r[c]) !== null).length;
    colHasData.push(filled >= Math.max(2, body.length * 0.5));
  }
  const sampleCols = colHasData.map((ok, i) => (ok ? i + 1 : -1)).filter((i) => i > 0);
  if (sampleCols.length === 0) {
    return { table: null, errors: ['No column of numbers was found next to the x column.'] };
  }

  const errors: string[] = [];
  const usable: { x: number; ys: number[] }[] = [];
  body.forEach((r, i) => {
    const rowNo = i + 1 + (headerRow ? 1 : 0);
    const x = num(r[0]);
    if (x === null) {
      errors.push(`Row ${rowNo}, column 1 ("${(r[0] ?? '').trim()}") is not a number.`);
      return;
    }
    const ys = sampleCols.map((c) => num(r[c]));
    if (ys.some((v) => v === null)) {
      const bad = sampleCols[ys.findIndex((v) => v === null)];
      errors.push(`Row ${rowNo}, column ${bad + 1} is empty or not a number.`);
      return;
    }
    usable.push({ x, ys: ys as number[] });
  });
  if (errors.length > 0) return { table: null, errors: errors.slice(0, 5) };

  usable.sort((a, b) => a.x - b.x);
  const headerName = (c: number, fallback: string) => {
    const h = headerRow?.[c]?.trim();
    return h ? h : fallback;
  };
  return {
    table: {
      xHeader: headerName(0, 'x'),
      x: usable.map((u) => u.x),
      samples: sampleCols.map((c, k) => ({
        name: headerName(c, `Sample ${k + 1}`),
        values: usable.map((u) => u.ys[k]),
      })),
    },
    errors: [],
  };
}

/** Guesses whether the first column is wavelength (nm) or wavenumber (cm⁻¹). */
export function guessXUnit(x: readonly number[], xHeader = ''): SpectralUnit {
  if (/cm\s*[-⁻]|wavenumber|1\/cm/i.test(xHeader)) return 'wavenumber';
  if (/nm|wavelength/i.test(xHeader)) return 'wavelength';
  return Math.max(...x) > 3000 ? 'wavenumber' : 'wavelength';
}

/** Reads a File (CSV/TSV/TXT, or Excel .xls/.xlsx) into a SpectrumTable. */
export async function readSpectrumFile(file: File): Promise<ParsedTable> {
  const name = file.name.toLowerCase();
  if (name.endsWith('.xls') || name.endsWith('.xlsx')) {
    try {
      // Loaded only when an Excel file is chosen, so the main bundle stays small.
      const XLSX = await import('xlsx');
      const wb = XLSX.read(await file.arrayBuffer(), { type: 'array' });
      let best: ParsedTable | null = null;
      let bestRows = -1;
      for (const sheetName of wb.SheetNames) {
        const csv = XLSX.utils.sheet_to_csv(wb.Sheets[sheetName]);
        const parsed = parseSpectrumTable(csv);
        const n = parsed.table?.x.length ?? -1;
        if (n > bestRows) {
          best = parsed;
          bestRows = n;
        }
      }
      return best ?? { table: null, errors: ['The workbook has no sheets.'] };
    } catch {
      return { table: null, errors: ['This Excel file could not be read. Try saving it as CSV.'] };
    }
  }
  return parseSpectrumTable(await file.text());
}
