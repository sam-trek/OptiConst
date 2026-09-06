import { trapz } from '../math';
import type { QuantumYieldInput, QuantumYieldResult, QYPoint, Spectrum } from '../types';

/** Inner-filter-effect threshold from the source paper (Section 4.4). */
export const QY_ABSORBANCE_WARNING_THRESHOLD = 0.1;

/**
 * Integrates a PL spectrum over wavelength: integral I(lambda) dlambda.
 * Deliberately a plain wavelength-domain integral with no wavenumber/Jacobian
 * conversion -- that conversion only applies to the A21 pipeline's PL
 * handling (see units.ts / calculations/a21.ts) and must not be reused here,
 * it would change the units of the slope and therefore of Phi_sample.
 */
export function integratePlWavelength(spectrum: Spectrum): number {
  return trapz(spectrum.y, spectrum.x);
}

/**
 * Through-the-origin least-squares slope of y vs x (no intercept term),
 * i.e. minimizing sum((y - slope*x)^2): slope = sum(x*y) / sum(x^2).
 * Reduces to y/x for a single point.
 */
function slopeThroughOrigin(points: { x: number; y: number }[]): number {
  const sumXY = points.reduce((acc, p) => acc + p.x * p.y, 0);
  const sumXX = points.reduce((acc, p) => acc + p.x * p.x, 0);
  return sumXY / sumXX;
}

function toFitPoints(points: QYPoint[]): { x: number; y: number }[] {
  return points.map((p) => ({ x: 1 - 10 ** -p.absorbance, y: p.intensity }));
}

export function calculateQuantumYield(input: QuantumYieldInput): QuantumYieldResult {
  const { referencePoints, samplePoints, referenceQuantumYield, referenceRefractiveIndex, sampleRefractiveIndex } =
    input;

  if (referencePoints.length === 0) {
    throw new Error('At least one reference concentration point is required.');
  }
  if (samplePoints.length === 0) {
    throw new Error('At least one sample concentration point is required.');
  }

  const referenceFitPoints = toFitPoints(referencePoints);
  const sampleFitPoints = toFitPoints(samplePoints);

  const referenceSlope = slopeThroughOrigin(referenceFitPoints);
  const sampleSlope = slopeThroughOrigin(sampleFitPoints);

  const quantumYieldSample =
    referenceQuantumYield * (sampleSlope / referenceSlope) * (sampleRefractiveIndex / referenceRefractiveIndex) ** 2;

  return {
    referenceSlope,
    sampleSlope,
    quantumYieldSample,
    referenceFitPoints,
    sampleFitPoints,
  };
}

/** Points whose absorbance is at/above the inner-filter-effect threshold -- surface as a warning, not a hard block. */
export function findHighAbsorbancePoints(points: QYPoint[], label: string): string[] {
  return points
    .map((p, i) => ({ p, i }))
    .filter(({ p }) => p.absorbance >= QY_ABSORBANCE_WARNING_THRESHOLD)
    .map(
      ({ p, i }) =>
        `${label} point ${i + 1}: absorbance ${p.absorbance.toFixed(3)} is at or above ${QY_ABSORBANCE_WARNING_THRESHOLD} -- inner-filter effects may bias the result.`,
    );
}

/**
 * True if any point has absorbance exactly 0. x = 1-10^-A is then exactly 0
 * for that point, and the through-origin slope (sum(x*y)/sum(x^2)) either
 * divides by zero (single point) or silently drops the point's contribution
 * (multiple points) -- this must block computation rather than surface a
 * NaN or a quietly-wrong Phi_sample.
 */
export function hasZeroAbsorbance(points: QYPoint[]): boolean {
  return points.some((p) => p.absorbance === 0);
}
