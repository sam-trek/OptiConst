import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import {
  absorbanceToEpsilon,
  calculateAbsorptionSample,
  rangeToWavenumber,
} from '../src/lib/calculations/absorption';
import { calculateB12, filterRangeNm } from '../src/lib/calculations/b12';
import { MATLAB_CONSTANTS, PAPER_CONSTANTS } from '../src/lib/constants';
import { parseSpectrumCsv } from '../src/lib/csv';

function fixture(name: string): string {
  return readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8');
}

const wl = [500, 600, 700, 800];

describe('filterRangeNm', () => {
  it('keeps points inside a wavelength window, inclusive of both ends', () => {
    const r = filterRangeNm(wl, [1, 2, 3, 4], 'wavelength', [600, 700]);
    expect(r.x).toEqual([600, 700]);
    expect(r.y).toEqual([2, 3]);
  });

  it('converts the window when the file is in wavenumber', () => {
    // 600 nm = 16666.67 cm^-1, 700 nm = 14285.71 cm^-1
    const x = [12500, 14285.714285714286, 16666.666666666668, 20000];
    const r = filterRangeNm(x, [1, 2, 3, 4], 'wavenumber', [600, 700]);
    expect(r.y).toEqual([2, 3]);
  });

  it('does not care which way round the range is given', () => {
    expect(filterRangeNm(wl, [1, 2, 3, 4], 'wavelength', [700, 600]).x).toEqual([600, 700]);
  });
});

describe('rangeToWavenumber', () => {
  it('maps 500–800 nm onto 12 500–20 000 cm⁻¹', () => {
    const [lo, hi] = rangeToWavenumber([500, 800]);
    expect(lo).toBeCloseTo(12500, 6);
    expect(hi).toBeCloseTo(20000, 6);
  });
});

describe('absorbanceToEpsilon', () => {
  it('rescales so the tallest point equals ε max', () => {
    const eps = absorbanceToEpsilon([0.1, 0.5, 1, 0.2], { mode: 'emax', emax: 200000 }, 1);
    expect(Math.max(...eps)).toBeCloseTo(200000, 6);
    expect(eps[0]).toBeCloseTo(20000, 6);
  });

  it('uses ε = A / (c·L) when concentration and molar mass are given', () => {
    // 0.0004 mg/mL ÷ 1427.94 g/mol = 2.8012e-7 mol/L
    const eps = absorbanceToEpsilon([0.4], { mode: 'conc', massConc: 0.0004, molarMass: 1427.94 }, 1);
    expect(eps[0]).toBeCloseTo(0.4 / (0.0004 / 1427.94), 3);
  });

  it('refuses a missing ε max or missing concentration instead of returning NaN', () => {
    expect(() => absorbanceToEpsilon([1], { mode: 'emax' }, 1)).toThrow(/ε max/);
    expect(() => absorbanceToEpsilon([1], { mode: 'conc', massConc: 0 }, 1)).toThrow(/concentration/);
  });
});

describe('calculateAbsorptionSample', () => {
  const { spectrum } = parseSpectrumCsv(fixture('B12_WL_Absorbance_vs_Wavelength_nm.csv'));
  const params = { molarMass: 1427.94, massConc: 0.0004, pathLength: 1, refractiveIndex: 1.524, quantumYield: 0 };

  it('gives the same answer as the original notebook port when fed concentration + molar mass', () => {
    const original = calculateB12(spectrum!, 'wavelength', params);
    const viaNew = calculateAbsorptionSample(
      spectrum!.x,
      spectrum!.y,
      { mode: 'conc', massConc: params.massConc, molarMass: params.molarMass },
      { xUnit: 'wavelength', rangeNm: [0, 1e6], refractiveIndex: params.refractiveIndex, pathLength: 1 },
    );
    expect(viaNew.b12).toBeCloseTo(original.b12, -10);
    expect(Math.abs(viaNew.b12 / original.b12 - 1)).toBeLessThan(1e-12);
    expect(Math.abs(viaNew.oscillatorStrength / original.oscillatorStrength - 1)).toBeLessThan(1e-12);
  });

  it('integrating only part of the band gives a smaller area', () => {
    const x = spectrum!.x;
    const all = calculateAbsorptionSample(x, spectrum!.y, { mode: 'emax', emax: 1e5 }, {
      xUnit: 'wavelength', rangeNm: [Math.min(...x), Math.max(...x)], refractiveIndex: 1.5, pathLength: 1,
    });
    const mid = (Math.min(...x) + Math.max(...x)) / 2;
    const part = calculateAbsorptionSample(x, spectrum!.y, { mode: 'emax', emax: 1e5 }, {
      xUnit: 'wavelength', rangeNm: [Math.min(...x), mid], refractiveIndex: 1.5, pathLength: 1,
    });
    expect(part.integralEpsilonOverNu).toBeLessThan(all.integralEpsilonOverNu);
    expect(part.pointsUsed).toBeLessThan(all.pointsUsed);
  });

  it('says so when fewer than two points fall inside the range', () => {
    expect(() =>
      calculateAbsorptionSample([400, 410, 420], [0.1, 0.2, 0.1], { mode: 'emax', emax: 1e5 }, {
        xUnit: 'wavelength', rangeNm: [900, 950], refractiveIndex: 1.5, pathLength: 1,
      }),
    ).toThrow(/two data points/);
  });

  it('B12 scales with 1/n and the constants presets move the answer by well under 1%', () => {
    const x = spectrum!.x;
    const run = (n: number, constants?: typeof PAPER_CONSTANTS) =>
      calculateAbsorptionSample(x, spectrum!.y, { mode: 'emax', emax: 1e5 }, {
        xUnit: 'wavelength', rangeNm: [Math.min(...x), Math.max(...x)], refractiveIndex: n, pathLength: 1, constants,
      });
    expect(run(1.5).b12 / run(3).b12).toBeCloseTo(2, 9);
    const base = run(1.524).b12;
    for (const c of [PAPER_CONSTANTS, MATLAB_CONSTANTS]) {
      expect(Math.abs(run(1.524, c).b12 / base - 1)).toBeLessThan(0.01);
    }
  });
});
