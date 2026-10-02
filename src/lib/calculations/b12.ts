import { EXACT_SI, type ConstantSet } from '../constants';
import { argmax, sortByX, trapz } from '../math';
import { nmToWavenumber } from '../units';
import type { B12Result, SampleParameters, Spectrum, SpectralUnit } from '../types';

/**
 * Ports "B12 Calculator from wavelength.ipynb" / "B12 Calculator from
 * wavenumber.ipynb" 1:1, including the mg/mL-treated-as-g/L concentration
 * trick the notebooks use (numerically identical, since 1 mg/mL = 1 g/L).
 *
 * NOTE (flagged for the scientist to confirm, not silently changed):
 * the original notebooks compute `peak_index = np.argmax(epsilon)` on the
 * *unsorted* epsilon array, then index the *sorted* wavenumber array with
 * it (`w[peak_index]`) to report peakWavenumber. When the input isn't
 * already ascending by wavenumber (both provided test CSVs are descending),
 * that mismatch reports the wrong peak wavenumber. This port instead finds
 * the peak on the sorted arrays, which is what "peak wavenumber" should
 * mean. Every other output (integrals, B12, mu, f12) does not depend on
 * peak_index and will match the notebooks exactly.
 *
 * NOTE: the notebooks print `mu` with a "D" (Debye) unit suffix but never
 * apply the SI->Debye conversion factor (1 D = 3.33564e-30 C*m) — `mu` here
 * is the raw formula output in whatever unit the inputs imply, ported as-is.
 * The client's own slides use the same unlabelled-but-unconverted value, so
 * the "Verify against paper" page compares like with like.
 */

/** Optional extras layered on top of the notebook behaviour. */
export interface B12Options {
  /** Only integrate the part of the spectrum between these wavelengths (nm), inclusive. */
  rangeNm?: [number, number];
  /** Physical constants to use. Defaults to the exact SI values. */
  constants?: ConstantSet;
}

/** The numbers the B12 formula needs from an already-computed epsilon spectrum. */
export interface B12Core {
  integralEpsilon: number; // ∫ε dν̃
  integralEpsilonOverNu: number; // ∫ε/ν̃ dν̃
  peakWavenumber: number;
  maxEpsilon: number;
  /** ln(10)·1000·c·100 / (h·n·Nₐ): the fixed factor that turns the area into B12. */
  factor: number;
  b12: number;
  transitionDipoleMoment: number;
  oscillatorStrength: number;
  /** ε spectrum actually used (ascending wavenumber). */
  spectrum: { wavenumber: number[]; epsilon: number[] };
}

/**
 * The shared maths. `wavenumber` (cm⁻¹) and `epsilon` (L·mol⁻¹·cm⁻¹) must
 * be the same length; they're sorted ascending by wavenumber here.
 */
export function b12FromEpsilon(
  wavenumber: readonly number[],
  epsilon: readonly number[],
  refractiveIndex: number,
  constants: ConstantSet = EXACT_SI,
): B12Core {
  if (wavenumber.length < 2) {
    throw new Error('Need at least two data points inside the chosen range.');
  }
  const { x: w, y: eps } = sortByX(wavenumber, epsilon);

  const peakIdx = argmax(eps);
  const integralEpsilon = trapz(eps, w);
  const integrand = eps.map((e, i) => e / w[i]);
  const integralEpsilonOverNu = trapz(integrand, w);

  const { h, c, NA } = constants;
  const factor = (Math.log(10) * 1000 * c * 1e2) / (h * refractiveIndex * NA);
  const b12 = factor * integralEpsilonOverNu;
  const mu = Math.sqrt((2 * h ** 2 * b12) / (8 * Math.PI ** 3));
  const f12 = (4.39e-9 * integralEpsilon) / refractiveIndex;

  return {
    integralEpsilon,
    integralEpsilonOverNu,
    peakWavenumber: w[peakIdx],
    maxEpsilon: eps[peakIdx],
    factor,
    b12,
    transitionDipoleMoment: mu,
    oscillatorStrength: f12,
    spectrum: { wavenumber: w, epsilon: eps },
  };
}

/**
 * Keeps only the points inside [fromNm, toNm]. `x` is in `unit`; the result
 * is returned in the same unit and keeps `y` aligned.
 */
export function filterRangeNm(
  x: readonly number[],
  y: readonly number[],
  unit: SpectralUnit,
  rangeNm: [number, number],
): { x: number[]; y: number[] } {
  const lo = Math.min(...rangeNm);
  const hi = Math.max(...rangeNm);
  const eps = 1e-9;
  // In wavenumber terms the window is [1e7/hi, 1e7/lo].
  const nuLo = nmToWavenumber(hi);
  const nuHi = nmToWavenumber(lo);
  const keepX: number[] = [];
  const keepY: number[] = [];
  x.forEach((xi, i) => {
    const inside =
      unit === 'wavelength'
        ? xi >= lo - eps && xi <= hi + eps
        : xi >= nuLo * (1 - eps) && xi <= nuHi * (1 + eps);
    if (inside) {
      keepX.push(xi);
      keepY.push(y[i]);
    }
  });
  return { x: keepX, y: keepY };
}

export function calculateB12(
  raw: Spectrum,
  unit: SpectralUnit,
  params: SampleParameters,
  options: B12Options = {},
): B12Result {
  const { molarMass, massConc, pathLength, refractiveIndex: n } = params;

  const cMolPerL = massConc / molarMass; // mg/mL numerically == g/L, so this is mol/L

  const windowed = options.rangeNm
    ? filterRangeNm(raw.x, raw.y, unit, options.rangeNm)
    : { x: [...raw.x], y: [...raw.y] };

  const wavenumberRaw = unit === 'wavelength' ? windowed.x.map(nmToWavenumber) : windowed.x;
  const epsilonRaw = windowed.y.map((a) => a / (cMolPerL * pathLength));

  const core = b12FromEpsilon(wavenumberRaw, epsilonRaw, n, options.constants);

  return {
    integralEpsilon: core.integralEpsilon,
    integralEpsilonOverNu: core.integralEpsilonOverNu,
    peakWavenumber: core.peakWavenumber,
    maxEpsilon: core.maxEpsilon,
    b12: core.b12,
    transitionDipoleMoment: core.transitionDipoleMoment,
    oscillatorStrength: core.oscillatorStrength,
    spectrum: core.spectrum,
  };
}
