import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateB12 } from '../src/lib/calculations/b12';
import { parseSpectrumCsv } from '../src/lib/csv';

// Ground-truth values reproduced by running the original notebooks' own
// pandas/numpy/scipy code (unmodified, aside from stripping ipywidgets)
// against these same fixture CSVs. See the plan's Validation Plan section:
// the port is only correct once these match to notebook precision.
// peakWavenumber uses the *corrected* peak-index logic (see b12.ts NOTE) --
// the notebooks' literal `w[argmax(unsorted epsilon)]` gives 18181.82 here,
// not the true peak at 22222.22.

function fixture(name: string): string {
  return readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8');
}

function expectClose(actual: number, expected: number, rel = 1e-9) {
  expect(Math.abs((actual - expected) / expected)).toBeLessThan(rel);
}

describe('calculateB12 — from wavelength (B12 Calculator from wavelength.ipynb)', () => {
  it('matches the reference notebook output', () => {
    const { spectrum } = parseSpectrumCsv(fixture('B12_WL_Absorbance_vs_Wavelength_nm.csv'));
    const result = calculateB12(spectrum!, 'wavelength', {
      molarMass: 1427.94,
      massConc: 0.0004,
      pathLength: 1.0,
      refractiveIndex: 1.524,
      quantumYield: 0,
    });

    expectClose(result.integralEpsilon, 4507126730.909077);
    expectClose(result.integralEpsilonOverNu, 201663.75084448012);
    expectClose(result.peakWavenumber, 22222.222222222223);
    expectClose(result.maxEpsilon, 1431509.85);
    expectClose(result.b12, 2.2891398902470504e28);
    expectClose(result.transitionDipoleMoment, 9.001966479399581e-21);
    expectClose(result.oscillatorStrength, 12.983127525387696);
  });
});

describe('calculateB12 — from wavenumber (B12 Calculator from wavenumber.ipynb)', () => {
  it('matches the reference notebook output', () => {
    const { spectrum } = parseSpectrumCsv(fixture('B12_WN_Absorbance_vs_Wavenumber_cm-1.csv'));
    const result = calculateB12(spectrum!, 'wavenumber', {
      molarMass: 538.95,
      massConc: 0.0005,
      pathLength: 1.0,
      refractiveIndex: 1.43,
      quantumYield: 0,
    });

    expectClose(result.integralEpsilon, 1360906412.2605);
    expectClose(result.integralEpsilonOverNu, 60891.453877190244);
    expectClose(result.peakWavenumber, 22222.22);
    expectClose(result.maxEpsilon, 432237.9);
    expectClose(result.b12, 7.366306174207433e27);
    expectClose(result.transitionDipoleMoment, 5.1065325874632534e-21);
    expectClose(result.oscillatorStrength, 4.177887517359157);
  });
});
