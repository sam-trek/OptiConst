# OptiConst

A static, client-side calculator for standard photophysical quantities — the
Einstein A21 and B12 coefficients, radiative/fluorescence lifetime,
transition dipole moment, and oscillator strength — from a molecule's
absorbance and photoluminescence spectra.

Ports the math from four original Jupyter notebooks into a single browser
tool. Everything runs client-side: uploaded spectra never leave the browser,
and the built site is static (no backend to host).

## Pages

- **Calculator** – upload one CSV / Excel file (a wavelength column plus one
  column per sample), pick the samples and wavelength range, enter ε max (or
  concentration and molar mass) and the solvent's refractive index, and get a
  results table (ν̃ peak, ε max, ∫ε/ν̃ dν̃, B₁₂, μ, f₁₂), a spectrum chart and a
  step-by-step "how it was worked out" panel. Copy / CSV / PDF export.
- **Verify against paper** – runs the tool on the client's own
  `Absorption Data.xls` (ITIC, IT-2Cl, IT-4Cl) with the settings of the
  "ITIC derivatives" table (Zijun Shen report, slide 27) and compares the
  results row by row. The paper's two typos are corrected and flagged.
- **Lifetime & quantum yield** – the original A21 / τ0 / relative-QY workflow.

## Stack

- Vite + Svelte 5 + TypeScript
- Plotly.js for the lifetime/QY chart; plain SVG for the absorption chart
- PapaParse for the PL CSV parsing, SheetJS (`xlsx`, loaded only when an Excel
  file is chosen) for `.xls` / `.xlsx`
- jsPDF + jspdf-autotable for the one-click PDF report

## Develop

```bash
npm install
npm run dev
```

## Test

The calculation engine (`src/lib/calculations/`) is validated against the
original notebooks (`tests/b12.test.ts`, `a21.test.ts`, `quantumYield.test.ts`)
and against the paper (`tests/paper.test.ts`: all 12 compared values within ±1%
of slide 27).

```bash
npm test
npm run check
```

## Build

```bash
npm run build
```

Outputs a static bundle in `dist/`, deployable to any static host.

## Notes for the scientist

- The "D" label on the transition dipole moment is carried over from the
  notebooks and the slides; the value is the raw formula output, not converted
  to debye.
- The Calculator's constants card offers exact SI values (default), the rounded
  values quoted in the slides, and the values hard-coded in the original MATLAB
  program. They change B₁₂ by well under 1%.
- `Absorption Data.xls` is normalised (peak = 1), so ε max per sample is an
  input. The paper's range is 500–800 nm.
