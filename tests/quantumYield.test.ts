import { readFileSync } from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { calculateQuantumYield, hasZeroAbsorbance, integratePlWavelength } from '../src/lib/calculations/quantumYield';
import { parseSpectrumCsv } from '../src/lib/csv';

// Ground truth from the QY test dataset's own README (worked by hand
// alongside the fixture): integrating each PL spectrum over wavelength
// should give these four intensities, and plugging them into the
// through-origin slope + relative-QY formula should give Phi_sample ~= 0.42.

function fixture(name: string): string {
  return readFileSync(path.join(__dirname, 'fixtures', name), 'utf-8');
}

function expectClose(actual: number, expected: number, rel = 1e-3) {
  expect(Math.abs((actual - expected) / expected)).toBeLessThan(rel);
}

// NOTE: the dataset's own README states the formula as x = 1 - 10^(-A), same
// as the spec, but its worked "Reference slope ~= 1000.0 / Sample slope ~=
// 688.32" figures were actually computed with x = A directly (21/0.021 =
// 1000 exactly, 48/0.048 = 1000 exactly -- that's y/A, not y/(1-10^-A)).
// Those two only look alike because for absorbance this small,
// 1-10^-A ~= A*ln(10), and that constant ln(10) factor cancels out of the
// slope *ratio* -- so Phi_sample ~= 0.42 still comes out right either way,
// but the intermediate slopes below are computed correctly per the actual
// x = 1-10^-A formula (spec-verified by hand), not copied from the README.

describe('integratePlWavelength', () => {
  it('reproduces the dataset README intensities for each QY fixture', () => {
    const refPoint1 = parseSpectrumCsv(fixture('QY_Reference_PL_point1_vs_Wavelength_nm.csv')).spectrum!;
    const refPoint2 = parseSpectrumCsv(fixture('QY_Reference_PL_point2_vs_Wavelength_nm.csv')).spectrum!;
    const samplePoint1 = parseSpectrumCsv(fixture('QY_Sample_PL_point1_vs_Wavelength_nm.csv')).spectrum!;
    const samplePoint2 = parseSpectrumCsv(fixture('QY_Sample_PL_point2_vs_Wavelength_nm.csv')).spectrum!;

    // 1% tolerance: the README's intensities were "worked by hand" (likely
    // integrated from the underlying analytic curve) while trapz here
    // integrates the discretely-sampled fixture -- up to ~0.75% numerical
    // deviation between the two is expected, not a bug.
    expectClose(integratePlWavelength(refPoint1), 21.0, 1e-2);
    expectClose(integratePlWavelength(refPoint2), 48.0, 1e-2);
    expectClose(integratePlWavelength(samplePoint1), 13.078, 1e-2);
    expectClose(integratePlWavelength(samplePoint2), 30.286, 1e-2);
  });
});

describe('calculateQuantumYield', () => {
  it('matches the QY_experiment_points.csv worked answer (Phi_sample ~= 0.42)', () => {
    // From QY_experiment_points.csv: Reference Phi_R = 0.546, n_R = 1.330,
    // n_S = 1.406; absorbance at 350nm per point as tabulated there.
    const result = calculateQuantumYield({
      referenceQuantumYield: 0.546,
      referenceRefractiveIndex: 1.33,
      sampleRefractiveIndex: 1.406,
      referencePoints: [
        { absorbance: 0.021, intensity: 21.0 },
        { absorbance: 0.048, intensity: 48.0 },
      ],
      samplePoints: [
        { absorbance: 0.019, intensity: 13.078 },
        { absorbance: 0.044, intensity: 30.286 },
      ],
    });

    expectClose(result.referenceSlope, 456.39, 1e-3);
    expectClose(result.sampleSlope, 312.88, 1e-3);
    expectClose(result.quantumYieldSample, 0.42, 1e-2);
  });

  it('reduces to y/x for a single point on each side', () => {
    const result = calculateQuantumYield({
      referenceQuantumYield: 0.5,
      referenceRefractiveIndex: 1.33,
      sampleRefractiveIndex: 1.33,
      referencePoints: [{ absorbance: 0.02, intensity: 10 }],
      samplePoints: [{ absorbance: 0.02, intensity: 5 }],
    });
    // Same x on both sides and equal refractive indices -> ratio of y's.
    expectClose(result.quantumYieldSample, 0.25, 1e-6);
  });

  it('would divide by zero if a single-point side has absorbance 0 (why hasZeroAbsorbance must gate compute)', () => {
    const result = calculateQuantumYield({
      referenceQuantumYield: 0.5,
      referenceRefractiveIndex: 1.33,
      sampleRefractiveIndex: 1.33,
      referencePoints: [{ absorbance: 0, intensity: 10 }],
      samplePoints: [{ absorbance: 0.02, intensity: 5 }],
    });
    expect(Number.isNaN(result.quantumYieldSample)).toBe(true);
  });

  it('throws when a side has no points', () => {
    expect(() =>
      calculateQuantumYield({
        referenceQuantumYield: 0.5,
        referenceRefractiveIndex: 1.33,
        sampleRefractiveIndex: 1.33,
        referencePoints: [],
        samplePoints: [{ absorbance: 0.02, intensity: 5 }],
      }),
    ).toThrow();
  });
});

describe('hasZeroAbsorbance', () => {
  it('is true when any point has absorbance exactly 0', () => {
    expect(hasZeroAbsorbance([{ absorbance: 0, intensity: 10 }])).toBe(true);
    expect(hasZeroAbsorbance([{ absorbance: 0.02, intensity: 10 }, { absorbance: 0, intensity: 5 }])).toBe(true);
  });

  it('is false when no point has absorbance 0', () => {
    expect(hasZeroAbsorbance([{ absorbance: 0.02, intensity: 10 }])).toBe(false);
    expect(hasZeroAbsorbance([])).toBe(false);
  });
});
