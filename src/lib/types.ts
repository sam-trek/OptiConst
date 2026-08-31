export type SpectralUnit = 'wavelength' | 'wavenumber';

/** A parsed two-column spectrum CSV: x is nm or cm^-1 depending on context. */
export interface Spectrum {
  x: number[];
  y: number[];
}

export interface SampleParameters {
  molarMass: number; // g/mol
  massConc: number; // mg/mL
  pathLength: number; // cm
  refractiveIndex: number;
  quantumYield: number; // only used for A21 -> tau1
}

export interface B12Result {
  integralEpsilon: number; // integral eps(nu) dnu, L mol^-1 cm^-2
  integralEpsilonOverNu: number; // integral eps(nu)/nu dnu, L mol^-1 cm^-1
  peakWavenumber: number; // cm^-1
  maxEpsilon: number; // L mol^-1 cm^-1
  b12: number; // cm^3 J^-1 s^-2
  transitionDipoleMoment: number; // see NOTE in calculations/b12.ts re: units
  oscillatorStrength: number; // f12, dimensionless
  spectrum: { wavenumber: number[]; epsilon: number[] };
}

export interface A21Result {
  integralEpsilonOverNu: number; // L/mol
  meanInverseNuCubed: number; // cm^-3
  a21: number; // s^-1
  tau0: number; // radiative lifetime, s
  tau1: number; // fluorescence lifetime, s
  epsilonSpectrum: { wavenumber: number[]; epsilon: number[] };
  plSpectrum: { wavenumber: number[]; intensity: number[] };
}
