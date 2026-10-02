import type { ResultRow } from './types';

const HEADER = [
  'Sample',
  'Solvent',
  'Peak wavenumber (1/cm)',
  'ε max (L·mol⁻¹·cm⁻¹)',
  'Range low (1/cm)',
  'Range high (1/cm)',
  '∫ε/ν̃ dν̃ (L·mol⁻¹·cm⁻¹)',
  'B12 (cm³·J⁻¹·s⁻²)',
  'μ',
  'f12',
];

export function resultMatrix(rows: ResultRow[]): string[][] {
  return [
    HEADER,
    ...rows.map((r) => [
      r.id,
      r.solvent,
      r.peakWavenumber.toFixed(2),
      r.epsMax.toFixed(1),
      r.rangeLo.toFixed(2),
      r.rangeHi.toFixed(2),
      r.integralOverNu.toFixed(3),
      r.b12.toExponential(6),
      r.mu.toExponential(6),
      r.f12.toFixed(4),
    ]),
  ];
}

function csvCell(v: string): string {
  return /[",\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

export function toCsv(matrix: string[][]): string {
  return matrix.map((r) => r.map(csvCell).join(',')).join('\n') + '\n';
}

/** Tab-separated, so it pastes straight into Excel or Word. */
export function toTsv(matrix: string[][]): string {
  return matrix.map((r) => r.join('\t')).join('\n');
}

export function downloadText(filename: string, text: string, mime = 'text/csv'): void {
  const blob = new Blob(['﻿' + text], { type: `${mime};charset=utf-8` });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
