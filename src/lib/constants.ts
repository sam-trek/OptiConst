// CODATA / SI-exact values, matching scipy.constants (h, c, N_A) used by the
// original Jupyter notebooks. All three are exact-by-definition since the
// 2019 SI redefinition, so there is no precision drift versus scipy.
export const PLANCK_H = 6.62607015e-34; // J*s
export const SPEED_OF_LIGHT = 299792458; // m/s
export const AVOGADRO_NA = 6.02214076e23; // 1/mol

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
