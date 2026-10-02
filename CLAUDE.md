# OptiConst — guide for Claude Code

Read this file first, then read `CLAUDE_CODE_LOG.md` (history and current status). Keep the log up to date while you work (see "Logging protocol").

## What this project is

- OptiConst is a static, in-browser calculator for photophysics numbers: Einstein B12 and A21, transition dipole moment (μ), oscillator strength (f12), radiative and fluorescence lifetime, relative quantum yield.
- It was ported from four Jupyter notebooks. Everything runs client-side; files are never uploaded. Hosted on GitHub Pages (`base: '/OptiConst/'`).
- The client is a photophysics group (LMU / KAUST). The developer (Muhit) is not a photophysics expert, so numbers must be provably right and explainable.
- The client's question: "how do you know the calculation is correct?" The answer is the **Verify against paper** page, which re-runs the tool on the client's own data and compares it with slide 27 ("ITIC derivatives") of the Zijun Shen report.

## Commands

- `npm install` — also refreshes `package-lock.json` (commit it; CI uses `npm ci`).
- `npm run dev` — local dev server.
- `npm run check` — `svelte-check` + `tsc` for the node config. Must end with 0 errors.
- `npm test` — vitest, all tests in `tests/`.
- `npm run build` — static bundle in `dist/`.
- CI (`.github/workflows/deploy.yml`) runs check, test, build on push to `main`. Do not push broken code to `main`; work on a branch.

## Stack and layout

- Vite + Svelte 5 (runes: `$state`, `$derived`, `$props`) + TypeScript. Plotly only for the lifetime/QY chart. PapaParse for the older CSV path. SheetJS (`xlsx`) loaded with a dynamic `import()` only when an Excel file is chosen. jsPDF + jspdf-autotable for the PDF report.
- `src/App.svelte` — top bar, three pages kept mounted (hidden with `hidden`): Calculator, Verify, Lifetime.
- `src/components/CalculatorView.svelte` — the main page. Owns all state (file, samples, range, ε max values, solvent, constants), derives results with `$derived`.
- `src/components/` — `ResultsTable` (table, turns into cards via CSS container query), `AbsorptionChart` (hand-made SVG, sized with `bind:clientWidth`), `WorkedSteps` ("how it was worked out"), `VerifyView`, `LifetimeView` (the old A21/QY screen, moved from the old `App.svelte`), plus the older small components.
- `src/lib/calculations/b12.ts` — `b12FromEpsilon` (shared maths), `filterRangeNm`, `calculateB12` (notebook port).
- `src/lib/calculations/absorption.ts` — multi-sample pipeline: scale to ε (ε max, or concentration + molar mass), window, integrate.
- `src/lib/paper.ts` — the paper's settings, saved paper values, typo corrections, `runPaperExample`, `verifyAgainstPaper`.
- `src/lib/spreadsheet.ts` — multi-column CSV parser, `.xls/.xlsx` reader, unit guess.
- `src/lib/constants.ts` — exact SI values plus the "paper" and "MATLAB" constant sets.
- `src/data/paperAbsorption.ts` — the client's `Absorption Data.xls` (401 rows, 3 samples) as a CSV string. Same data in `test data/Absorption_Data_ITIC_normalised.csv` and `tests/fixtures/`.
- `src/app.css` — all shared styles (tokens, cards, tables, verify page).

## Maths rules — do not change these to make a test pass

- ε = A / (c·L). Wavenumber ν̃ = 1e7 / λ(nm).
- B12 = ln(10) · 1000 · c(m/s) · 100 / (h · n · Nₐ) × ∫ε/ν̃ dν̃ (trapezoid over the chosen range).
- μ = √(2h²·B12 / (8π³)). It is labelled "D" but NOT converted to debye. This matches the notebooks and the client's slides. Leave it, but do not hide it either.
- f12 = 4.39e-9 · ∫ε dν̃ / n.
- A21 (Strickler–Berg) = 2.88e-9 · n² · ∫ε/ν̃ dν̃ / ⟨ν̃⁻³⟩; τ0 = 1/A21; τf = Φ·τ0.
- Relative quantum yield: Φs = Φr · (slope_s / slope_r) · (n_s / n_r)².
- `Absorption Data.xls` is NORMALISED (peak = 1), so each sample needs an ε max. The paper uses a 500–800 nm window (12.5–20.0 ×10³ cm⁻¹), n = 1.524 (chlorobenzene), exact SI constants.
- The peak wavenumber is found on the sorted arrays (the notebooks had an index mismatch; see the comment in `b12.ts`).

## The paper check (acceptance test)

- Tool vs slide 27, ITIC / IT-2Cl / IT-4Cl, ε max = 204.8e3 / 212.5e3 / 237.1e3:
  - ∫ε/ν̃ dν̃ ×10⁻³: 31.243 / 31.614 / 33.296
  - B12 (×10²⁷): 3.547 / 3.589 / 3.780
  - μ (×10⁻²¹): 3.543 / 3.564 / 3.658
  - f12: 1.423 / 1.410 / 1.460
  - Peak ν̃ (×10³ cm⁻¹): 14.97 / 14.66 / 14.41 (exact match)
- `tests/paper.test.ts` requires all 12 values within ±1%. Never loosen that tolerance or edit the saved paper values to make it pass. If it fails, the maths or the data changed: find out why.
- Two typos in the paper's table are corrected and shown in amber: ITIC B12 printed ×10²⁸ (should be ×10²⁷); IT-2Cl ∫ε/ν̃ printed 34.71 (its own B12 implies about 31.7).
- Known small gap: about 0.2–0.6% on B12 (the paper behaves like n ≈ 1.53). That is an open question for the client, not a bug.

## Design rules (the layout was approved as a mockup)

- Clean teal look: `--accent #0e8074`, Archivo for text, JetBrains Mono for numbers. Tokens live in `:root` in `src/app.css`.
- One type scale: 13 / 14 / 16 / 18 / 24 / 56 px (`--fs-xs … --fs-hero`). No text under 13 px, including SVG chart text.
- Must work from 320 px to 1920 px with **no horizontal scroll**. Two columns above 1100 px, one column below. Tables become cards through container queries. Touch targets at least 42 px.
- Shared CSS class names were chosen to avoid clashing with the older scoped components: `fld`, `cap-lbl`, `stepno`, `chartbox`, `cmain`. Do not rename them back to `field`, `lbl`, `num`, `chart`, `main` (the old `QuantumYieldStep` and `SpectrumChart` use those names).

## Current state (important)

- The new Calculator, Verify and Lifetime pages were written in a cloud sandbox where the npm registry was blocked. The calculation code and 48 tests passed there, but **Svelte was never compiled, `npm run check` and `npm run build` were never run, and the screens were never opened in a browser.** Expect a first round of errors.
- Likely trouble spots to look at first:
  - `$state<AbsorptionChart>()` / `bind:this` on a component, and `export function toImageDataUrl` in `AbsorptionChart.svelte`.
  - Generic runes such as `$derived<[number, number]>(…)` and `$derived.by<ConstantSet>(…)` in `CalculatorView.svelte`.
  - Svelte a11y warnings (rows with `onclick`, `tabindex` on non-interactive elements). Warnings are fine, errors are not.
  - `xlsx` types and the dynamic import in `src/lib/spreadsheet.ts`; add `xlsx` to the lockfile.
  - `LifetimeView.svelte` was cut out of the old `App.svelte`; check its scoped CSS and that the Plotly chart still sizes correctly after switching pages (it sits in a hidden `div` while on another page, so it may need a resize when shown).
  - Layout at 320 px: three nav tabs in one row; results table to cards switch; chart axis labels.
  - `package-lock.json` must be committed or CI's `npm ci` fails.

## How to work

- Work on a branch (`fix/first-run` for the first pass), commit small, push the branch. Do not merge to `main` yourself.
- Fix the smallest thing that is wrong. Do not redesign, do not add features, do not change the maths.
- If something is unclear about the science (units, which n, which constants), stop and ask in the log under "Questions for Muhit" instead of guessing.
- Plain language in the log: Muhit is a developer, not a chemist.

## Logging protocol (required)

Muhit reads `CLAUDE_CODE_LOG.md` in a separate Claude chat to follow what you did, so keep it current.

- File: `CLAUDE_CODE_LOG.md` at the repo root. Commit it together with your code changes.
- Keep the **"Current status"** block at the top up to date: one line each for state, last command run, what is failing, what is next.
- Add a new entry at the END of the file after every meaningful step (a command run, a fix, a decision). Use this shape:

```
### YYYY-MM-DD HH:MM — short title
- Did: what you ran or changed
- Result: pass or fail, with the exact error text (trimmed) if it failed
- Files: files you changed
- Next: what you will do next
```

- Log at least: start of session, each failing command with its error, each fix, each test or build result, each visual check (width, what was seen), anything you could not fix, and a final summary.
- Never delete old entries. If an earlier entry was wrong, add a correction entry.
- When finished, set "Current status" to READY (everything green) or BLOCKED (with the reason and what is needed).
