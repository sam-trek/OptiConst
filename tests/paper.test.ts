import { describe, expect, it } from 'vitest';
import {
  PAPER_SAMPLES,
  PAPER_VALUES,
  WAITING_SAMPLES,
  paperTable,
  runPaperExample,
  verifyAgainstPaper,
} from '../src/lib/paper';

// "Verify against paper": the client's own absorption data, run through the
// tool with the settings on slide 27 of the Zijun Shen report, must give the
// numbers printed in that slide (after the two obvious typos are corrected).

describe('built-in paper dataset', () => {
  it('has 401 rows, 400–800 nm, and the three ITIC-derivative samples', () => {
    const t = paperTable();
    expect(t.x.length).toBe(401);
    expect(t.x[0]).toBe(400);
    expect(t.x[400]).toBe(800);
    expect(t.samples.map((s) => s.name)).toEqual(['ITIC', 'IT-2Cl', 'IT-4Cl']);
  });

  it('is normalised: every sample peaks at exactly 1', () => {
    for (const s of paperTable().samples) expect(Math.max(...s.values)).toBe(1);
  });
});

describe('tool vs. paper (slide 27)', () => {
  const results = runPaperExample();

  it('matches the peak wavenumbers exactly (14.97, 14.66, 14.41 ×10³ cm⁻¹)', () => {
    expect(results['ITIC'].peakWavenumber / 1e3).toBeCloseTo(14.97, 2);
    expect(results['IT-2Cl'].peakWavenumber / 1e3).toBeCloseTo(14.66, 2);
    expect(results['IT-4Cl'].peakWavenumber / 1e3).toBeCloseTo(14.41, 2);
  });

  it('reproduces all 12 compared values within ±1%', () => {
    const v = verifyAgainstPaper(results, 1);
    const worst = v.rows.map((r) => `${r.sampleId} ${r.quantity}: ${r.diffPct.toFixed(2)}%`);
    expect(v.total).toBe(12);
    expect(v.passed, worst.join('\n')).toBe(12);
  });

  it('is still at least 10 of 12 at ±0.5%, and never worse than ±1% on any row', () => {
    expect(verifyAgainstPaper(results, 0.5).passed).toBeGreaterThanOrEqual(10);
    for (const r of verifyAgainstPaper(results, 1).rows) {
      expect(Math.abs(r.diffPct)).toBeLessThanOrEqual(1);
    }
  });

  it('flags exactly the two typo-corrected rows as "fixed", and the rest as plain matches', () => {
    const v = verifyAgainstPaper(results, 1);
    const fixed = v.rows.filter((r) => r.status === 'fixed').map((r) => `${r.sampleId}:${r.quantity}`);
    expect(fixed.sort()).toEqual(['ITIC:b12', 'IT-2Cl:integral'].sort());
    expect(v.rows.filter((r) => r.status === 'match').length).toBe(10);
  });

  it('reports a row as "differs" when it is outside the tolerance', () => {
    const v = verifyAgainstPaper(results, 0.1);
    expect(v.rows.some((r) => r.status === 'differs')).toBe(true);
    expect(v.passed).toBeLessThan(12);
  });

  it('gives the numbers recorded when this check was first worked out', () => {
    const near = (a: number, b: number) => Math.abs(a / b - 1) < 2e-3;
    expect(near(results['ITIC'].integralEpsilonOverNu, 31243)).toBe(true);
    expect(near(results['ITIC'].b12, 3.5465e27)).toBe(true);
    expect(near(results['IT-2Cl'].b12, 3.5886e27)).toBe(true);
    expect(near(results['IT-4Cl'].b12, 3.7795e27)).toBe(true);
    expect(near(results['IT-4Cl'].oscillatorStrength, 1.46)).toBe(true);
  });
});

describe('saved paper values', () => {
  it('keeps the printed text of every value and a corrected number only where a typo was found', () => {
    for (const s of PAPER_SAMPLES) {
      for (const q of Object.values(PAPER_VALUES[s.id])) {
        expect(q.printed.length).toBeGreaterThan(0);
        expect(q.used).toBeGreaterThan(0);
      }
    }
    expect(PAPER_VALUES['ITIC'].b12.fix).toBeTruthy();
    expect(PAPER_VALUES['IT-2Cl'].integral.fix).toBeTruthy();
    expect(PAPER_VALUES['IT-4Cl'].b12.fix).toBeUndefined();
  });

  it('lists the five samples whose data we do not have yet', () => {
    expect(WAITING_SAMPLES.map((w) => w.id)).toEqual(['IT-2F', 'IT-4F', 'm-ITIC', 'm-ITIC-2F', 'm-ITIC-4F']);
  });
});
