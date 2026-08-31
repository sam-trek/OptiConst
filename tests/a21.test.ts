import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateA21 } from '../src/lib/calculations/a21';
import { parseSpectrumCsv } from '../src/lib/csv';

// Ground-truth values reproduced by running the original notebooks' own
// pandas/numpy/scipy code against these fixture CSVs (absorbance spectrum
// reused from the B12 wavenumber fixture, since the unified app reuses a
// single absorbance upload for both B12 and A21 — see a21.ts NOTE).

function fixture(name: string): string {
  return readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8');
}

function expectClose(actual: number, expected: number, rel = 1e-9) {
  expect(Math.abs((actual - expected) / expected)).toBeLessThan(rel);
}

describe('calculateA21 — PL in wavelength (A21 FromWavelength-Photon counts.ipynb)', () => {
  it('matches the reference notebook output', () => {
    const abs = parseSpectrumCsv(fixture('B12_WN_Absorbance_vs_Wavenumber_cm-1.csv')).spectrum!;
    const pl = parseSpectrumCsv(fixture('A21_WL_PL_vs_Wavelength_nm.csv')).spectrum!;

    const result = calculateA21(abs, 'wavenumber', pl, 'wavelength', {
      molarMass: 538.95,
      massConc: 0.0005,
      pathLength: 1.0,
      refractiveIndex: 1.43,
      quantumYield: 0.22,
    });

    expectClose(result.integralEpsilonOverNu, 60891.453877190244);
    expectClose(result.meanInverseNuCubed, 1.4201100013976501e-13);
    expectClose(result.a21, 2525218255.3706813);
    expectClose(result.tau0, 3.96005374138723e-10);
    expectClose(result.tau1, 8.712118231051905e-11);
  });
});

describe('calculateA21 — PL in wavenumber (A21 FromWavenumber.ipynb)', () => {
  it('matches the reference notebook output', () => {
    const abs = parseSpectrumCsv(fixture('B12_WN_Absorbance_vs_Wavenumber_cm-1.csv')).spectrum!;
    const pl = parseSpectrumCsv(fixture('A21_WN_PL_vs_Wavenumber_cm-1.csv')).spectrum!;

    const result = calculateA21(abs, 'wavenumber', pl, 'wavenumber', {
      molarMass: 303.365,
      massConc: 0.0005,
      pathLength: 1.0,
      refractiveIndex: 1.3284,
      quantumYield: 0.43,
    });

    expectClose(result.integralEpsilonOverNu, 34274.67465526269);
    expectClose(result.meanInverseNuCubed, 1.3919451355690147e-13);
    expectClose(result.a21, 1251415255.6617448);
    expectClose(result.tau0, 7.990952607263868e-10);
    expectClose(result.tau1, 3.436109621123463e-10);
  });
});
