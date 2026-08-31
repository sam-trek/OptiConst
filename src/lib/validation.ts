import type { Spectrum } from './types';

const MIN_POINTS = 5;
const BASELINE_FRACTION = 0.05; // endpoint value vs peak, above which we warn

/**
 * Flags spectra that will technically compute but likely give a misleading
 * result: too few points, absorbance/intensity that hasn't returned to
 * baseline at the scan edges, negative values, or a very narrow scan range.
 */
export function checkSpectrumSanity(spectrum: Spectrum, label: string): string[] {
  const warnings: string[] = [];
  const { x, y } = spectrum;

  if (x.length < MIN_POINTS) {
    warnings.push(`${label}: only ${x.length} data points — results may be unreliable below ${MIN_POINTS} points.`);
  }

  const range = Math.max(...x) - Math.min(...x);
  if (range < (Math.max(...x) || 1) * 0.02) {
    warnings.push(`${label}: scan range is very narrow (${range.toFixed(2)} units) — check the integral isn't dominated by edge effects.`);
  }

  const negativeCount = y.filter((v) => v < 0).length;
  if (negativeCount > 0) {
    warnings.push(`${label}: ${negativeCount} negative value(s) found — check baseline correction.`);
  }

  const peak = Math.max(...y.map(Math.abs));
  if (peak > 0) {
    const sortedByX = x.map((xi, i) => ({ xi, yi: y[i] })).sort((a, b) => a.xi - b.xi);
    const first = Math.abs(sortedByX[0].yi);
    const last = Math.abs(sortedByX[sortedByX.length - 1].yi);
    if (first > peak * BASELINE_FRACTION || last > peak * BASELINE_FRACTION) {
      warnings.push(`${label}: trace hasn't returned to baseline at the edge of the scan range — the integral may run high.`);
    }
  }

  return warnings;
}
