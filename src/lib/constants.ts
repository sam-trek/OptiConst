// CODATA / SI-exact values, matching scipy.constants (h, c, N_A) used by the
// original Jupyter notebooks. All three are exact-by-definition since the
// 2019 SI redefinition, so there is no precision drift versus scipy.
export const PLANCK_H = 6.62607015e-34; // J*s
export const SPEED_OF_LIGHT = 299792458; // m/s
export const AVOGADRO_NA = 6.02214076e23; // 1/mol

/** A named set of physical constants the B12 formula can be run with. */
export interface ConstantSet {
  id: 'si' | 'paper' | 'matlab' | 'custom';
  label: string;
  h: number; // J*s
  c: number; // m/s
  NA: number; // 1/mol
}

export const EXACT_SI: ConstantSet = {
  id: 'si',
  label: 'Exact SI values (recommended)',
  h: PLANCK_H,
  c: SPEED_OF_LIGHT,
  NA: AVOGADRO_NA,
};

/** Rounded values quoted in the client's slides. */
export const PAPER_CONSTANTS: ConstantSet = {
  id: 'paper',
  label: 'The paper (h 6.626e-34, c 3e8, Nₐ 6.022e23)',
  h: 6.626e-34,
  c: 3e8,
  NA: 6.022e23,
};

/** Values hard-coded in the client's original MATLAB program (EinsteinCoefficients.m). */
export const MATLAB_CONSTANTS: ConstantSet = {
  id: 'matlab',
  label: 'Original MATLAB program (h 6.62e-34, c 3e8)',
  h: 6.62e-34,
  c: 3e8,
  NA: 6.02214086e23,
};

export const CONSTANT_PRESETS: ConstantSet[] = [EXACT_SI, PAPER_CONSTANTS, MATLAB_CONSTANTS];

export interface ReferenceDye {
  name: string;
  quantumYield: number;
  solvent: string;
  refractiveIndex: number;
  excitationNm: number;
}

// Commonly-cited literature values for the relative-QY reference standards.
// Double-check these against your own reference source before relying on
// them for a real measurement -- they are a starting point, not gospel.
export const REFERENCE_DYES: ReferenceDye[] = [
  { name: 'Quinine sulfate', quantumYield: 0.546, solvent: '0.1 M H₂SO₄', refractiveIndex: 1.33, excitationNm: 350 },
  { name: 'Rhodamine 6G', quantumYield: 0.95, solvent: 'Ethanol', refractiveIndex: 1.361, excitationNm: 488 },
  { name: 'Fluorescein', quantumYield: 0.79, solvent: '0.1 M NaOH', refractiveIndex: 1.33, excitationNm: 470 },
];
