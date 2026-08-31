import { describe, expect, it } from 'vitest';
import { parseSpectrumCsv } from '../src/lib/csv';

describe('parseSpectrumCsv', () => {
  it('parses a clean two-column CSV with a header', () => {
    const { spectrum, errors } = parseSpectrumCsv('Wavelength_nm,Absorbance\n350,0.01\n352,0.02\n');
    expect(errors).toEqual([]);
    expect(spectrum).toEqual({ x: [350, 352], y: [0.01, 0.02] });
  });

  it('reports a plain-language error for a non-numeric cell', () => {
    const { spectrum, errors } = parseSpectrumCsv('Wavelength_nm,Absorbance\n350,0.01\n352,notanumber\n');
    expect(spectrum).toBeNull();
    expect(errors).toEqual(['Row 3, column 2 ("notanumber") is not a number.']);
  });

  // Regression: a short row (e.g. a trailing "354" with no second column)
  // makes PapaParse itself emit a raw internal warning ("Unable to
  // auto-detect delimiting character..."). That message must never reach
  // the user directly -- the plan requires plain-language errors like
  // "Row N, column 2 is not a number", not a parser's own crash text.
  it('reports a plain-language error for a short row instead of a raw PapaParse message', () => {
    const { spectrum, errors } = parseSpectrumCsv('Wavelength_nm,Absorbance\n350,0.01\n354\n');
    expect(spectrum).toBeNull();
    expect(errors).toEqual(['Row 3: expected 2 columns, found 1.']);
  });
});
