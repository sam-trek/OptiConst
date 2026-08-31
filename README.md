# OptiConst

A static, client-side calculator for standard photophysical quantities — the
Einstein A21 and B12 coefficients, radiative/fluorescence lifetime,
transition dipole moment, and oscillator strength — from a molecule's
absorbance and photoluminescence spectra.

Ports the math from four original Jupyter notebooks into a single browser
tool. Everything runs client-side: uploaded spectra never leave the browser,
and the built site is static (no backend to host).

## Stack

- Vite + Svelte 5 + TypeScript
- Plotly.js for the spectrum chart
- PapaParse for CSV parsing/validation
- jsPDF + jspdf-autotable for the one-click PDF report

## Develop

```bash
npm install
npm run dev
```

## Test

The calculation engine (`src/lib/calculations/`) is validated against the
original notebooks: `tests/` reproduces the notebooks' own pandas/numpy/scipy
output for the fixture CSVs in `tests/fixtures/` and asserts the TypeScript
port matches to floating-point precision.

```bash
npm test
```

## Build

```bash
npm run build
```

Outputs a static bundle in `dist/`, deployable to any static host.
