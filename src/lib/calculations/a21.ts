import { sortByX, trapz } from '../math';
import { convertPlWavelengthToWavenumber, nmToWavenumber } from '../units';
import type { A21Result, SampleParameters, Spectrum, SpectralUnit } from '../types';

const STRICKLER_BERG_PREFACTOR = 2.88e-9;

/**
 * Ports "A21 FromWavelength-Photon counts.ipynb" / "A21 FromWavenumber.ipynb"
 * (the Strickler-Berg equation). Both original notebooks required the
 * absorbance spectrum in wavenumber; this port additionally accepts it in
 * wavelength (converted the same way B12's absorbance input is) so the
 * single unit toggle in the unified UI applies uniformly to whatever the
 * user uploads, per the plan's "one calculator, not four tools" goal. The
 * underlying epsilon/integral math is unchanged, so results for
 * wavenumber-supplied absorbance match the notebooks exactly.
 */
export function calculateA21(
  abs: Spectrum,
  absUnit: SpectralUnit,
  pl: Spectrum,
  plUnit: SpectralUnit,
  params: SampleParameters,
): A21Result {
  const { molarMass, massConc, pathLength, refractiveIndex: n, quantumYield } = params;

  const absWavenumberRaw = absUnit === 'wavelength' ? abs.x.map(nmToWavenumber) : abs.x;
  const cMolPerL = massConc / molarMass; // mg/mL numerically == g/L, so this is mol/L
  const epsilonRaw = abs.y.map((a) => a / (cMolPerL * pathLength));

  const { x: wAbs, y: epsilon } = sortByX(absWavenumberRaw, epsilonRaw);
  const integrand = epsilon.map((e, i) => e / wAbs[i]);
  const integralEpsilonOverNu = trapz(integrand, wAbs); // integral eps(nu)/nu dnu

  const plConverted =
    plUnit === 'wavelength'
      ? convertPlWavelengthToWavenumber(pl.x, pl.y)
      : { wavenumber: pl.x, intensity: pl.y };

  const { x: wPl, y: iPhoton } = sortByX(plConverted.wavenumber, plConverted.intensity);

  const integrandV3 = iPhoton.map((I, i) => I * wPl[i] ** -3);
  const meanInverseNuCubed = trapz(integrandV3, wPl) / trapz(iPhoton, wPl);

  const a21 = (STRICKLER_BERG_PREFACTOR * n ** 2 * integralEpsilonOverNu) / meanInverseNuCubed;
  const tau0 = 1 / a21;
  const tau1 = tau0 * quantumYield;

  return {
    integralEpsilonOverNu,
    meanInverseNuCubed,
    a21,
    tau0,
    tau1,
    epsilonSpectrum: { wavenumber: wAbs, epsilon },
    plSpectrum: { wavenumber: wPl, intensity: iPhoton },
  };
}
