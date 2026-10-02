import { describe, expect, it } from 'vitest';
import { guessXUnit, parseSpectrumTable, splitCsv } from '../src/lib/spreadsheet';

describe('splitCsv', () => {
  it('handles quoted cells, commas inside quotes and CRLF line endings', () => {
    expect(splitCsv('a,"b,c",d\r\n1,2,3\r\n')).toEqual([
      ['a', 'b,c', 'd'],
      ['1', '2', '3'],
    ]);
  });

  it('detects semicolon and tab delimiters', () => {
    expect(splitCsv('1;2;3')).toEqual([['1', '2', '3']]);
    expect(splitCsv('1\t2\t3')).toEqual([['1', '2', '3']]);
  });
});

describe('parseSpectrumTable', () => {
  it('reads a wavelength column plus several sample columns, with a header', () => {
    const { table, errors } = parseSpectrumTable('Wavelength (nm),A,B\n400,0.1,0.2\n401,0.3,0.4\n');
    expect(errors).toEqual([]);
    expect(table!.xHeader).toBe('Wavelength (nm)');
    expect(table!.x).toEqual([400, 401]);
    expect(table!.samples).toEqual([
      { name: 'A', values: [0.1, 0.3] },
      { name: 'B', values: [0.2, 0.4] },
    ]);
  });

  it('works without a header and names the samples itself', () => {
    const { table } = parseSpectrumTable('400,0.1\n401,0.3\n');
    expect(table!.samples[0].name).toBe('Sample 1');
  });

  it('sorts rows into ascending x even when the file runs high to low', () => {
    const { table } = parseSpectrumTable('wl,A\n800,0.5\n700,0.6\n600,0.7\n');
    expect(table!.x).toEqual([600, 700, 800]);
    expect(table!.samples[0].values).toEqual([0.7, 0.6, 0.5]);
  });

  it('understands scientific notation', () => {
    const { table } = parseSpectrumTable('800,4.57E-04\n799,0\n');
    expect(table!.samples[0].values).toEqual([0, 0.000457]);
  });

  it('gives a plain-language error for a bad cell', () => {
    const { table, errors } = parseSpectrumTable('wl,A\n400,0.1\nabc,0.2\n');
    expect(table).toBeNull();
    expect(errors[0]).toMatch(/Row 3, column 1/);
  });

  it('rejects a single-column file', () => {
    const { table, errors } = parseSpectrumTable('400\n401\n');
    expect(table).toBeNull();
    expect(errors[0]).toMatch(/two columns/);
  });
});

describe('guessXUnit', () => {
  it('uses the header when it says nm or cm⁻¹', () => {
    expect(guessXUnit([400, 800], 'Wavelength (nm)')).toBe('wavelength');
    expect(guessXUnit([400, 800], 'Wavenumber (cm-1)')).toBe('wavenumber');
  });

  it('falls back on the size of the numbers', () => {
    expect(guessXUnit([400, 800])).toBe('wavelength');
    expect(guessXUnit([12000, 25000])).toBe('wavenumber');
  });
});
