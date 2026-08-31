/** nm -> cm^-1, matching the notebooks' `1e7 / wavelength_nm`. */
export function nmToWavenumber(nm: number): number {
  return 1e7 / nm;
}

/**
 * Converts a PL spectrum given as intensity-per-unit-wavelength (nm) into
 * intensity-per-unit-wavenumber (cm^-1), applying the Jacobian |d(lambda)/d(nu)|
 * = 1 / nu^2 the same way the "FromWavelength" A21 notebook does. Only needed
 * when the PL spectrum was supplied in wavelength; a PL spectrum supplied
 * directly in wavenumber is used as-is (no Jacobian in the original notebook).
 */
export function convertPlWavelengthToWavenumber(
  wavelengthNm: readonly number[],
  intensity: readonly number[],
): { wavenumber: number[]; intensity: number[] } {
  const wavenumber = wavelengthNm.map(nmToWavenumber);
  const corrected = intensity.map((I, i) => I / wavenumber[i] ** 2);
  return { wavenumber, intensity: corrected };
}
