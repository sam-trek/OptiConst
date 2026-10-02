import { PAPER_ABSORPTION_CSV } from '../data/paperAbsorption';
import {
  calculateAbsorptionSample,
  type AbsorptionSampleResult,
} from './calculations/absorption';
import { EXACT_SI, type ConstantSet } from './constants';
import { parseSpectrumTable, type SpectrumTable } from './spreadsheet';

/** The settings the paper used for the ITIC derivatives (slide 27). */
export const PAPER_SETTINGS = {
  rangeNm: [500, 800] as [number, number],
  refractiveIndex: 1.524,
  solvent: 'Chlorobenzene',
  pathLength: 1,
};

export interface PaperSample {
  id: string;
  color: string;
  /** ε max from the paper's table, L·mol⁻¹·cm⁻¹. */
  emax: number;
}

export const PAPER_SAMPLES: PaperSample[] = [
  { id: 'ITIC', color: '#0e8074', emax: 204800 },
  { id: 'IT-2Cl', color: '#d9822b', emax: 212500 },
  { id: 'IT-4Cl', color: '#6a5acd', emax: 237100 },
];

export type QuantityKey = 'integral' | 'b12' | 'mu' | 'f12';

export const QUANTITIES: { key: QuantityKey; label: string; decimals: number | 'sci' }[] = [
  { key: 'integral', label: '∫ε/ν̃ dν̃ ·10⁻³', decimals: 2 },
  { key: 'b12', label: 'B₁₂', decimals: 'sci' },
  { key: 'mu', label: 'μ', decimals: 'sci' },
  { key: 'f12', label: 'f₁₂', decimals: 3 },
];

export interface PaperValue {
  /** Exactly as printed in the paper. */
  printed: string;
  /** The number the comparison uses (in the same unit as the tool's value). */
  used: number;
  /** Set when the printed value is a typo and `used` replaces it. */
  fix?: string;
}

/** Slide 27 of the Zijun Shen report, "ITIC derivatives". */
export const PAPER_VALUES: Record<string, Record<QuantityKey, PaperValue>> = {
  ITIC: {
    integral: { printed: '31.22', used: 31.22 },
    b12: {
      printed: '3.527×10²⁸',
      used: 3.527e27,
      fix: 'Exponent typo: every other row is ×10²⁷, so 28 is read as 27.',
    },
    mu: { printed: '3.533×10⁻²¹', used: 3.533e-21 },
    f12: { printed: '1.42', used: 1.42 },
  },
  'IT-2Cl': {
    integral: {
      printed: '34.71',
      used: 31.7,
      fix: "Typo: this row's B₁₂ works out to an area of about 31.7, so that value is used.",
    },
    b12: { printed: '3.578×10²⁷', used: 3.578e27 },
    mu: { printed: '3.6×10⁻²¹', used: 3.6e-21 },
    f12: { printed: '1.406', used: 1.406 },
  },
  'IT-4Cl': {
    integral: { printed: '33.40', used: 33.4 },
    b12: { printed: '3.772×10²⁷', used: 3.772e27 },
    mu: { printed: '3.652×10⁻²¹', used: 3.652e-21 },
    f12: { printed: '1.457', used: 1.457 },
  },
};

/** The five other samples in the slide, whose absorbance data we don't have yet. */
export const WAITING_SAMPLES: { id: string; integral: string; b12: string; mu: string; f12: string }[] = [
  { id: 'IT-2F', integral: '33.41', b12: '3.858×10²⁷', mu: '3.7×10⁻²¹', f12: '1.53' },
  { id: 'IT-4F', integral: '33.73', b12: '3.91×10²⁷', mu: '3.718×10⁻²¹', f12: '1.54' },
  { id: 'm-ITIC', integral: '34.05', b12: '3.865×10²⁷', mu: '3.69×10⁻²¹', f12: '1.56' },
  { id: 'm-ITIC-2F', integral: '31.24', b12: '3.528×10²⁷', mu: '3.534×10⁻²¹', f12: '1.4' },
  { id: 'm-ITIC-4F', integral: '28.25', b12: '3.190×10²⁷', mu: '3.361×10⁻²¹', f12: '1.26' },
];

let cachedTable: SpectrumTable | null = null;

/** The client's absorption data, parsed. */
export function paperTable(): SpectrumTable {
  if (!cachedTable) {
    const { table, errors } = parseSpectrumTable(PAPER_ABSORPTION_CSV);
    if (!table) throw new Error(`Built-in paper data failed to parse: ${errors.join(' ')}`);
    cachedTable = table;
  }
  return cachedTable;
}

/** Runs the tool on the client's data with the paper's settings. */
export function runPaperExample(
  constants: ConstantSet = EXACT_SI,
): Record<string, AbsorptionSampleResult> {
  const table = paperTable();
  const out: Record<string, AbsorptionSampleResult> = {};
  for (const s of PAPER_SAMPLES) {
    const col = table.samples.find((c) => c.name === s.id);
    if (!col) throw new Error(`Built-in data is missing sample ${s.id}.`);
    out[s.id] = calculateAbsorptionSample(
      table.x,
      col.values,
      { mode: 'emax', emax: s.emax },
      {
        xUnit: 'wavelength',
        rangeNm: PAPER_SETTINGS.rangeNm,
        refractiveIndex: PAPER_SETTINGS.refractiveIndex,
        pathLength: PAPER_SETTINGS.pathLength,
        constants,
      },
    );
  }
  return out;
}

/** The tool's value for one of the four compared quantities, in the paper's units. */
export function toolValue(r: AbsorptionSampleResult, key: QuantityKey): number {
  switch (key) {
    case 'integral':
      return r.integralEpsilonOverNu / 1e3;
    case 'b12':
      return r.b12;
    case 'mu':
      return r.transitionDipoleMoment;
    case 'f12':
      return r.oscillatorStrength;
  }
}

export type VerifyStatus = 'match' | 'fixed' | 'differs';

export interface VerifyRow {
  sampleId: string;
  quantity: QuantityKey;
  label: string;
  printed: string;
  used: number;
  fix?: string;
  tool: number;
  /** Signed difference in percent: (tool − used) / used × 100. */
  diffPct: number;
  withinTolerance: boolean;
  status: VerifyStatus;
}

export interface VerifySummary {
  rows: VerifyRow[];
  passed: number;
  total: number;
  tolerancePct: number;
}

/**
 * Compares the tool's numbers with the paper's. A row "passes" when it is
 * within the tolerance, whether or not the paper's printed value had to be
 * corrected. The status column still flags corrected values in amber.
 */
export function verifyAgainstPaper(
  results: Record<string, AbsorptionSampleResult>,
  tolerancePct = 1,
): VerifySummary {
  const rows: VerifyRow[] = [];
  for (const s of PAPER_SAMPLES) {
    const r = results[s.id];
    for (const q of QUANTITIES) {
      const p = PAPER_VALUES[s.id][q.key];
      const tool = toolValue(r, q.key);
      const diffPct = ((tool - p.used) / p.used) * 100;
      const withinTolerance = Math.abs(diffPct) <= tolerancePct + 1e-9;
      rows.push({
        sampleId: s.id,
        quantity: q.key,
        label: q.label,
        printed: p.printed,
        used: p.used,
        fix: p.fix,
        tool,
        diffPct,
        withinTolerance,
        status: !withinTolerance ? 'differs' : p.fix ? 'fixed' : 'match',
      });
    }
  }
  return {
    rows,
    passed: rows.filter((r) => r.withinTolerance).length,
    total: rows.length,
    tolerancePct,
  };
}
