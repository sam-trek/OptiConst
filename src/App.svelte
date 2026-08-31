<script lang="ts">
  import ParameterField from './components/ParameterField.svelte';
  import ResultTile from './components/ResultTile.svelte';
  import SpectrumChart from './components/SpectrumChart.svelte';
  import UnitToggle from './components/UnitToggle.svelte';
  import UploadSlot from './components/UploadSlot.svelte';
  import WarningBanner from './components/WarningBanner.svelte';
  import { calculateA21 } from './lib/calculations/a21';
  import { calculateB12 } from './lib/calculations/b12';
  import { formatLifetime, formatScientific } from './lib/format';
  import { downloadReport } from './lib/pdfReport';
  import type { A21Result, B12Result, SampleParameters, Spectrum, SpectralUnit } from './lib/types';
  import { checkSpectrumSanity } from './lib/validation';

  let unit = $state<SpectralUnit>('wavelength');

  let absSpectrum = $state<Spectrum | null>(null);
  let plSpectrum = $state<Spectrum | null>(null);

  let params = $state<SampleParameters>({
    molarMass: 400,
    massConc: 0.0053,
    pathLength: 1.0,
    refractiveIndex: 1.4,
    quantumYield: 0.5,
  });

  let b12Result = $state<B12Result | null>(null);
  let a21Result = $state<A21Result | null>(null);
  let computeError = $state<string | null>(null);
  let hasComputed = $state(false);
  let showAllResults = $state(false);

  let chart = $state<SpectrumChart>();

  const xUnitLabel = $derived(unit === 'wavelength' ? 'nm' : 'cm⁻¹');

  const warnings = $derived.by(() => {
    if (!hasComputed) return [];
    const w: string[] = [];
    if (absSpectrum) w.push(...checkSpectrumSanity(absSpectrum, 'Absorbance'));
    if (plSpectrum) w.push(...checkSpectrumSanity(plSpectrum, 'PL spectrum'));
    return w;
  });

  function compute() {
    computeError = null;
    if (!absSpectrum) {
      computeError = 'Upload an absorbance spectrum first.';
      return;
    }
    try {
      b12Result = calculateB12(absSpectrum, unit, params);
      a21Result = plSpectrum ? calculateA21(absSpectrum, unit, plSpectrum, unit, params) : null;
      hasComputed = true;
    } catch (e) {
      computeError = e instanceof Error ? e.message : String(e);
      b12Result = null;
      a21Result = null;
    }
  }

  async function exportReport() {
    if (!b12Result) return;
    const chartImageDataUrl = await chart?.toImageDataUrl();
    downloadReport({
      title: 'OptiConst — Optical Constants Report',
      inputMode: unit === 'wavelength' ? 'Wavelength (nm)' : 'Wavenumber (cm⁻¹)',
      parameters: [
        { label: 'Molar mass', value: `${params.molarMass} g/mol` },
        { label: 'Mass concentration', value: `${params.massConc} mg/mL` },
        { label: 'Path length', value: `${params.pathLength} cm` },
        { label: 'Refractive index n', value: `${params.refractiveIndex}` },
        { label: 'Quantum yield Φ', value: `${params.quantumYield}` },
      ],
      results: resultRows(),
      warnings,
      chartImageDataUrl,
    });
  }

  function resultRows() {
    const rows = [
      { label: 'Integral ∫ε(ν)dν', value: formatScientific(b12Result!.integralEpsilon), formula: 'trapz(ε, ν̃)' },
      { label: 'Integral ∫ε(ν)/ν dν', value: formatScientific(b12Result!.integralEpsilonOverNu), formula: 'trapz(ε/ν̃, ν̃)' },
      { label: 'Peak wavenumber', value: `${b12Result!.peakWavenumber.toFixed(0)} cm⁻¹`, formula: 'argmax(ε)' },
      { label: 'Max molar ε', value: formatScientific(b12Result!.maxEpsilon), formula: 'max(ε)' },
      { label: 'B12', value: formatScientific(b12Result!.b12), formula: 'ln(10)·1000·c·10²/(h·n·Nₐ) · ∫ε/ν̃dν̃' },
      { label: '|μ| — Dipole moment', value: formatScientific(b12Result!.transitionDipoleMoment), formula: '√(2h²B12/8π³)' },
      { label: 'f₁₂ — Oscillator strength', value: formatScientific(b12Result!.oscillatorStrength), formula: '4.39e-9·∫ε dν̃ / n' },
    ];
    if (a21Result) {
      rows.push(
        { label: '⟨ν̃⁻³⟩', value: formatScientific(a21Result.meanInverseNuCubed), formula: 'trapz(I·ν̃⁻³,ν̃) / trapz(I,ν̃)' },
        { label: 'A21 — Einstein coeff.', value: formatScientific(a21Result.a21), formula: '2.88e-9·n²·∫ε/ν̃dν̃ / ⟨ν̃⁻³⟩' },
        { label: 'τ0 — Radiative lifetime', value: formatLifetime(a21Result.tau0), formula: '1 / A21' },
        { label: 'τ1 — Fluorescence lifetime', value: formatLifetime(a21Result.tau1), formula: 'τ0 · Φ' },
      );
    }
    return rows;
  }

  const chartTraces = $derived.by(() => {
    if (!b12Result) return [];
    if (a21Result) {
      const epsMax = Math.max(...b12Result.spectrum.epsilon.map(Math.abs)) || 1;
      const plMax = Math.max(...a21Result.plSpectrum.intensity.map(Math.abs)) || 1;
      return [
        {
          x: b12Result.spectrum.wavenumber,
          y: b12Result.spectrum.epsilon.map((v) => v / epsMax),
          name: 'Absorption (normalized)',
          color: '#0E8074',
        },
        {
          x: a21Result.plSpectrum.wavenumber,
          y: a21Result.plSpectrum.intensity.map((v) => v / plMax),
          name: 'Emission (normalized)',
          color: '#E8A23D',
        },
      ];
    }
    return [
      {
        x: b12Result.spectrum.wavenumber,
        y: b12Result.spectrum.epsilon,
        name: 'ε (L·mol⁻¹·cm⁻¹)',
        color: '#0E8074',
      },
    ];
  });
</script>

<div class="app">
  <div class="topbar">
    <div class="brand"><span class="brand-mark">OptiConst</span></div>
    <div class="led-row">
      <span class="led" class:ready={!!b12Result}></span>
      <span class="led-label">{b12Result ? 'Ready' : 'Idle'}</span>
    </div>
  </div>

  <div class="body-grid">
    <div class="main">
      {#if !b12Result}
        <div class="empty-state">
          <p>Upload an absorbance spectrum on the right, set your sample parameters, and hit Calculate.</p>
          <p class="foot-note">Add a PL spectrum too if you also want A21 and lifetime results.</p>
        </div>
      {:else}
        <div class="readout">
          <div class="readout-grid">
            <ResultTile
              label="f₁₂ — Oscillator strength"
              value={formatScientific(b12Result.oscillatorStrength)}
              formula="4.39e-9·∫ε/ν̃dν̃ / n"
            />
            <ResultTile
              label="τ0 — Radiative lifetime"
              value={a21Result ? formatLifetime(a21Result.tau0) : '— upload PL'}
              formula="1 / A21"
            />
            <ResultTile
              label="A21 — Einstein coeff."
              value={a21Result ? formatScientific(a21Result.a21) + ' s⁻¹' : '— upload PL'}
              formula="2.88e-9·n²∫ε/ν̃dν̃/⟨ν̃⁻³⟩"
            />
            <ResultTile
              label="|μ| — Dipole moment"
              value={formatScientific(b12Result.transitionDipoleMoment)}
              formula="√(2h²B12/8π³)"
            />
          </div>
        </div>

        <div class="scope">
          <div class="scope-head">
            <span>{a21Result ? 'Absorption / emission' : 'Absorption spectrum'}</span>
            <span>{xUnitLabel}</span>
          </div>
          <SpectrumChart bind:this={chart} traces={chartTraces} xLabel="Wavenumber (cm⁻¹)" yLabel={a21Result ? 'Normalized intensity' : 'ε (L·mol⁻¹·cm⁻¹)'} />
        </div>

        {#each warnings as w}
          <WarningBanner message={w} />
        {/each}

        <div class="all-results">
          <button class="all-results-toggle" onclick={() => (showAllResults = !showAllResults)} aria-expanded={showAllResults}>
            <span class="chevron" class:open={showAllResults}>▸</span> All computed values
          </button>
          <div class="all-results-collapse" class:open={showAllResults}>
            <div class="all-results-inner">
              <table>
                <thead><tr><th>Result</th><th>Value</th><th>Formula</th></tr></thead>
                <tbody>
                  {#each resultRows() as row}
                    <tr><td>{row.label}</td><td class="mono">{row.value}</td><td class="mono formula">{row.formula}</td></tr>
                  {/each}
                </tbody>
              </table>
            </div>
          </div>
        </div>

        <div class="foot">
          <p class="foot-note">Formula shown beneath every result — verify the method, not just the number.</p>
          <button class="btn-print" onclick={exportReport}>
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
              <path d="M12 4v12" /><path d="M6 12l6 6 6-6" /><path d="M5 20h14" />
            </svg>
            Download report
          </button>
        </div>
      {/if}
    </div>

    <div class="deck">
      <p class="deck-label">Input mode</p>
      <UnitToggle bind:value={unit} />

      <p class="deck-label">Load spectra</p>
      <UploadSlot
        title="Absorbance.csv"
        subtitle={`Required · ${xUnitLabel}, A`}
        onLoaded={(s) => { absSpectrum = s; hasComputed = false; }}
      />
      <UploadSlot
        title="PL_spectrum.csv"
        subtitle="Optional · for τ0 / A21"
        onLoaded={(s) => { plSpectrum = s; hasComputed = false; }}
      />

      <p class="deck-label">Sample parameters</p>
      <div class="ctrl-grid">
        <ParameterField label="Molar mass" unit="g/mol" bind:value={params.molarMass} />
        <ParameterField label="Conc." unit="mg/mL" bind:value={params.massConc} />
        <ParameterField label="Path length" unit="cm" bind:value={params.pathLength} />
        <ParameterField label="Index n" unit=" " bind:value={params.refractiveIndex} />
        <ParameterField label="Φ yield" unit=" " bind:value={params.quantumYield} />
      </div>

      {#if computeError}
        <p class="error-text">{computeError}</p>
      {/if}

      <button class="btn-compute" onclick={compute}>Calculate</button>
    </div>
  </div>
</div>

<style>
  .app {
    height: 100vh;
    display: flex;
    flex-direction: column;
  }
  .topbar {
    flex: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    padding: 0 32px;
    height: 64px;
    border-bottom: 1px solid var(--line);
  }
  .brand {
    display: flex;
    align-items: baseline;
    gap: 10px;
  }
  .brand-mark {
    font-weight: 700;
    font-size: 22px;
    letter-spacing: -0.01em;
    color: var(--ink);
  }
  .led-row {
    display: flex;
    gap: 8px;
    align-items: center;
  }
  .led {
    width: 7px;
    height: 7px;
    border-radius: 50%;
    background: var(--ink-muted);
  }
  .led.ready {
    background: var(--accent);
  }
  .led-label {
    font-family: 'JetBrains Mono', monospace;
    font-size: 13px;
    color: var(--ink-muted);
  }

  .body-grid {
    flex: 1;
    min-height: 0;
    display: flex;
    flex-direction: row-reverse;
  }

  .deck {
    width: 392px;
    flex: none;
    padding: 20px 26px;
    border-right: 1px solid var(--line);
    display: flex;
    flex-direction: column;
    gap: 14px;
    overflow-y: auto;
  }
  .deck-label {
    font-weight: 600;
    font-size: 13.5px;
    letter-spacing: 0.02em;
    color: var(--ink-muted);
    margin: 0;
  }
  .ctrl-grid {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 8px;
  }
  .btn-compute {
    margin-top: auto;
    width: 100%;
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 9px;
    padding: 14px;
    font-weight: 700;
    font-size: 16px;
    cursor: pointer;
  }
  .error-text {
    color: var(--error);
    font-size: 13.5px;
    margin: 0;
  }

  .main {
    flex: 1;
    min-width: 0;
    padding: 20px 32px;
    display: flex;
    flex-direction: column;
    gap: 12px;
    min-height: 0;
    overflow-y: auto;
  }
  .empty-state {
    margin: auto;
    max-width: 380px;
    text-align: center;
    color: var(--ink-muted);
    font-size: 15.5px;
    line-height: 1.6;
  }
  .readout {
    flex: none;
    background: var(--alt);
    border-radius: 12px;
    padding: 16px 20px;
  }
  .readout-grid {
    display: grid;
    grid-template-columns: repeat(4, 1fr);
    gap: 20px;
  }
  .scope {
    flex: 1;
    min-height: 280px;
    background: var(--alt);
    border-radius: 12px;
    padding: 14px 20px 6px;
    display: flex;
    flex-direction: column;
  }
  .scope-head {
    flex: none;
    display: flex;
    justify-content: space-between;
    font-size: 13px;
    color: var(--ink-muted);
    margin-bottom: 6px;
  }

  .all-results {
    flex: none;
    font-size: 14px;
  }
  .all-results-toggle {
    display: flex;
    align-items: center;
    gap: 6px;
    cursor: pointer;
    color: var(--accent);
    font-weight: 600;
    padding: 4px 0;
    background: none;
    border: none;
    font-size: 14px;
  }
  .chevron {
    display: inline-block;
    transition: transform 200ms ease;
  }
  .chevron.open {
    transform: rotate(90deg);
  }
  .all-results-collapse {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 260ms ease;
  }
  .all-results-collapse.open {
    grid-template-rows: 1fr;
  }
  .all-results-inner {
    overflow: hidden;
    min-height: 0;
  }
  .all-results table {
    width: 100%;
    border-collapse: collapse;
    margin-top: 8px;
  }
  .all-results th {
    text-align: left;
    font-size: 12.5px;
    color: var(--ink-muted);
    border-bottom: 1px solid var(--line);
    padding: 5px 8px;
  }
  .all-results td {
    padding: 6px 8px;
    border-bottom: 1px solid var(--line);
  }
  .all-results .formula {
    color: var(--ink-muted);
    font-size: 12.5px;
  }

  .foot {
    flex: none;
    display: flex;
    justify-content: space-between;
    align-items: center;
    gap: 16px;
  }
  .foot-note {
    font-size: 13px;
    color: var(--ink-muted);
    max-width: 440px;
    line-height: 1.4;
  }
  .btn-print {
    display: flex;
    align-items: center;
    gap: 8px;
    background: transparent;
    border: 1.5px solid var(--ink);
    color: var(--ink);
    border-radius: 9px;
    padding: 9px 16px;
    font-weight: 600;
    font-size: 14.5px;
    cursor: pointer;
    flex: none;
  }
</style>
