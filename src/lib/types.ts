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

/** One reference or sample concentration point for the relative QY method. */
export interface QYPoint {
  absorbance: number; // A at the excitation wavelength (single number, not a spectrum)
  intensity: number; // integral I(lambda) dlambda over the emission band, plain wavelength integral
}

export interface QuantumYieldInput {
  referenceQuantumYield: number; // Phi_R, from the picked preset or typed by the user
  referenceRefractiveIndex: number; // n_R
  sampleRefractiveIndex: number; // n_S
  referencePoints: QYPoint[]; // >= 1 point
  samplePoints: QYPoint[]; // >= 1 point
}

export interface QuantumYieldResult {
  referenceSlope: number; // gradient of I vs (1-10^-A), reference, through origin
  sampleSlope: number; // same, sample
  quantumYieldSample: number; // Phi_S, the final answer
  referenceFitPoints: { x: number; y: number }[]; // x = 1-10^-A, for charting
  sampleFitPoints: { x: number; y: number }[];
}
