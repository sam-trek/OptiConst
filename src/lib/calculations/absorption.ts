import { EXACT_SI, type ConstantSet } from '../constants';
import { nmToWavenumber } from '../units';
import { b12FromEpsilon, filterRangeNm } from './b12';
import type { SpectralUnit } from '../types';

/**
 * What the numbers in the uploaded file mean.
 * - 'real':       true absorbance (A). Can be turned into ε with a known
 *                 concentration, or scaled to a known ε max.
 * - 'normalised': the tallest point is 1. It has no real scale, so ε max
 *                 must be supplied.
 */
export type AbsorbanceKind = 'real' | 'normalised';

/** How a sample's ε scale is found. */
export type ScaleMode = 'emax' | 'conc';

export interface SampleScale {
  mode: ScaleMode;
  /** ε at the peak, L·mol⁻¹·cm⁻¹ (mode 'emax'). */
  emax?: number;
  /** Mass concentration, mg/mL (mode 'conc'). Numerically g/L. */
  massConc?: number;
  /** Molar mass, g/mol (mode 'conc'). */
  molarMass?: number;
}

export interface AbsorptionSettings {
  xUnit: SpectralUnit;
  rangeNm: [number, number];
  refractiveIndex: number;
  pathLength: number; // cm
  constants?: ConstantSet;
}

export interface AbsorptionSampleResult {
  /** Peak wavenumber inside the range, cm⁻¹. */
  peakWavenumber: number;
  /** ε at the peak inside the range, L·mol⁻¹·cm⁻¹. */
  maxEpsilon: number;
  /** Wavenumber window (cm⁻¹) the range corresponds to: [low, high]. */
  rangeWavenumber: [number, number];
  integralEpsilon: number; // ∫ε dν̃
  integralEpsilonOverNu: number; // ∫ε/ν̃ dν̃
  factor: number; // ln10·1000·c·100/(h·n·Nₐ)
  b12: number;
  transitionDipoleMoment: number;
  oscillatorStrength: number;
  pointsUsed: number;
  /** Whole-file ε spectrum in wavelength order, for plotting. */
  epsilonSpectrum: { x: number[]; epsilon: number[] };
}

/** Wavenumber window for a wavelength range. */
export function rangeToWavenumber(rangeNm: [number, number]): [number, number] {
  const lo = Math.min(...rangeNm);
  const hi = Math.max(...rangeNm);
  return [nmToWavenumber(hi), nmToWavenumber(lo)];
}

/**
 * ε (L·mol⁻¹·cm⁻¹) for every point of one sample column.
 *
 * - 'emax' mode rescales the column so its tallest point equals ε max. That
 *   is exactly what "normalised absorbance × ε max" means, and it also
 *   works for real absorbance when only ε max is known.
 * - 'conc' mode uses ε = A / (c·L) with c = (mg/mL) / (g/mol) in mol/L.
 */
export function absorbanceToEpsilon(
  absorbance: readonly number[],
  scale: SampleScale,
  pathLength: number,
): number[] {
  if (scale.mode === 'emax') {
    const emax = scale.emax;
    if (!emax || !Number.isFinite(emax) || emax <= 0) {
      throw new Error('Enter ε max (a positive number) for this sample.');
    }
    const peak = Math.max(...absorbance);
    if (!(peak > 0)) throw new Error('This sample column has no positive absorbance values.');
    return absorbance.map((a) => (a / peak) * emax);
  }
  const { massConc, molarMass } = scale;
  if (!massConc || !molarMass || massConc <= 0 || molarMass <= 0) {
    throw new Error('Enter concentration and molar mass for this sample.');
  }
  const cMolPerL = massConc / molarMass;
  return absorbance.map((a) => a / (cMolPerL * pathLength));
}

/** Runs the full B12 pipeline for one sample column. */
export function calculateAbsorptionSample(
  x: readonly number[],
  absorbance: readonly number[],
  scale: SampleScale,
  settings: AbsorptionSettings,
): AbsorptionSampleResult {
  if (!(settings.refractiveIndex > 0)) throw new Error('Refractive index must be a positive number.');
  if (!(settings.pathLength > 0)) throw new Error('Path length must be a positive number.');

  const epsilonAll = absorbanceToEpsilon(absorbance, scale, settings.pathLength);
  const windowed = filterRangeNm(x, epsilonAll, settings.xUnit, settings.rangeNm);
  if (windowed.x.length < 2) {
    throw new Error('Fewer than two data points fall inside the chosen range.');
  }
  const wavenumber =
    settings.xUnit === 'wavelength' ? windowed.x.map(nmToWavenumber) : windowed.x;
  const core = b12FromEpsilon(
    wavenumber,
    windowed.y,
    settings.refractiveIndex,
    settings.constants ?? EXACT_SI,
  );

  // Whole-file ε, ascending by wavelength, for the chart.
  const wlAll = settings.xUnit === 'wavelength' ? [...x] : x.map(nmToWavenumber);
  const order = wlAll.map((_, i) => i).sort((a, b) => wlAll[a] - wlAll[b]);

  return {
    peakWavenumber: core.peakWavenumber,
    maxEpsilon: core.maxEpsilon,
    rangeWavenumber: rangeToWavenumber(settings.rangeNm),
    integralEpsilon: core.integralEpsilon,
    integralEpsilonOverNu: core.integralEpsilonOverNu,
    factor: core.factor,
    b12: core.b12,
    transitionDipoleMoment: core.transitionDipoleMoment,
    oscillatorStrength: core.oscillatorStrength,
    pointsUsed: windowed.x.length,
    epsilonSpectrum: {
      x: order.map((i) => wlAll[i]),
      epsilon: order.map((i) => epsilonAll[i]),
    },
  };
}
