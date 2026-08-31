import { AVOGADRO_NA, PLANCK_H, SPEED_OF_LIGHT } from '../constants';
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
 */
export function calculateB12(
  raw: Spectrum,
  unit: SpectralUnit,
  params: SampleParameters,
): B12Result {
  const { molarMass, massConc, pathLength, refractiveIndex: n } = params;

  const wavenumberRaw = unit === 'wavelength' ? raw.x.map(nmToWavenumber) : raw.x;
  const absorbance = raw.y;

  const cMolPerL = massConc / molarMass; // mg/mL numerically == g/L, so this is mol/L
  const epsilonRaw = absorbance.map((a) => a / (cMolPerL * pathLength));

  const { x: w, y: eCorr } = sortByX(wavenumberRaw, epsilonRaw);

  const peakIdx = argmax(eCorr);
  const peakWavenumber = w[peakIdx];
  const maxEpsilon = eCorr[peakIdx];

  const integralEpsilon = trapz(eCorr, w); // integral eps(nu) dnu
  const integrand = eCorr.map((e, i) => e / w[i]);
  const integralEpsilonOverNu = trapz(integrand, w); // integral eps(nu)/nu dnu

  const b12 =
    ((Math.log(10) * 1000 * SPEED_OF_LIGHT * 1e2) / (PLANCK_H * n * AVOGADRO_NA)) *
    integralEpsilonOverNu;

  const u2 = (2 * PLANCK_H ** 2 * b12) / (8 * Math.PI ** 3);
  const mu = Math.sqrt(u2);

  const f12 = (4.39e-9 * integralEpsilon) / n;

  return {
    integralEpsilon,
    integralEpsilonOverNu,
    peakWavenumber,
    maxEpsilon,
    b12,
    transitionDipoleMoment: mu,
    oscillatorStrength: f12,
    spectrum: { wavenumber: w, epsilon: eCorr },
  };
}
