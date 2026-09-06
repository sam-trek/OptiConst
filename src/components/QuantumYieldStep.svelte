<script lang="ts">
  import {
    calculateQuantumYield,
    findHighAbsorbancePoints,
    hasZeroAbsorbance,
    integratePlWavelength,
  } from '../lib/calculations/quantumYield';
  import { REFERENCE_DYES } from '../lib/constants';
  import { parseSpectrumCsv, readFileAsText } from '../lib/csv';
  import type { QuantumYieldResult, QYPoint } from '../lib/types';
  import CollapsibleStepCard from './CollapsibleStepCard.svelte';
  import WarningBanner from './WarningBanner.svelte';

  export interface QYReferenceInfo {
    name: string;
    quantumYield: number;
  }

  let {
    onResult,
  }: { onResult: (result: QuantumYieldResult | null, reference: QYReferenceInfo | null) => void } = $props();

  const CUSTOM = '__custom__';
  const ZERO_ABSORBANCE_MESSAGE = "Absorbance can't be 0 — enter the reading at your excitation wavelength";

  let selectedDye = $state(REFERENCE_DYES[0].name);
  let customQuantumYield = $state(0.5);
  let customRefractiveIndex = $state(1.33);
  let customSolvent = $state('');

  const referenceQuantumYield = $derived(
    selectedDye === CUSTOM ? customQuantumYield : (REFERENCE_DYES.find((d) => d.name === selectedDye)?.quantumYield ?? 0.5),
  );
  const referenceRefractiveIndex = $derived(
    selectedDye === CUSTOM
      ? customRefractiveIndex
      : (REFERENCE_DYES.find((d) => d.name === selectedDye)?.refractiveIndex ?? 1.33),
  );

  let sampleRefractiveIndex = $state(1.406);

  let referencePoints = $state<QYPoint[]>([{ absorbance: 0, intensity: 0 }]);
  let samplePoints = $state<QYPoint[]>([{ absorbance: 0, intensity: 0 }]);

  let result = $state<QuantumYieldResult | null>(null);
  let error = $state<string | null>(null);
  let warnings = $state<string[]>([]);

  function addPoint(points: QYPoint[]) {
    points.push({ absorbance: 0, intensity: 0 });
  }
  function removePoint(points: QYPoint[], i: number) {
    if (points.length > 1) points.splice(i, 1);
  }

  async function uploadIntensity(point: QYPoint, file: File) {
    const text = await readFileAsText(file);
    const parsed = parseSpectrumCsv(text);
    if (parsed.spectrum) {
      point.intensity = integratePlWavelength(parsed.spectrum);
    }
  }

  function compute() {
    error = null;

    if (hasZeroAbsorbance(referencePoints) || hasZeroAbsorbance(samplePoints)) {
      warnings = [ZERO_ABSORBANCE_MESSAGE];
      result = null;
      onResult(null, null);
      return;
    }

    try {
      result = calculateQuantumYield({
        referenceQuantumYield,
        referenceRefractiveIndex,
        sampleRefractiveIndex,
        referencePoints,
        samplePoints,
      });
      warnings = [
        ...findHighAbsorbancePoints(referencePoints, 'Reference'),
        ...findHighAbsorbancePoints(samplePoints, 'Sample'),
      ];
      onResult(result, { name: selectedDye === CUSTOM ? 'Custom reference' : selectedDye, quantumYield: referenceQuantumYield });
    } catch (e) {
      error = e instanceof Error ? e.message : String(e);
      result = null;
      onResult(null, null);
    }
  }
</script>

<CollapsibleStepCard stepNumber={1} title="Quantum Yield">
  <p class="step-sub">Relative method — compare your sample against a reference dye with a known Φ.</p>

  <select class="field-select" bind:value={selectedDye}>
    {#each REFERENCE_DYES as dye (dye.name)}
      <option value={dye.name}>{dye.name} (Φ = {dye.quantumYield}, {dye.solvent})</option>
    {/each}
    <option value={CUSTOM}>Custom reference…</option>
  </select>

  {#if selectedDye === CUSTOM}
    <div class="field-row">
      <label class="field">Φ reference<input type="number" step="any" bind:value={customQuantumYield} /></label>
      <label class="field">n reference<input type="number" step="any" bind:value={customRefractiveIndex} /></label>
      <label class="field">Solvent<input type="text" bind:value={customSolvent} placeholder="e.g. Ethanol" /></label>
    </div>
  {/if}

  <div class="point-group">
    <div class="point-group-label">Reference points</div>
    <p class="point-group-hint">Type the absorbance reading, then either type the integrated PL intensity or upload its PL spectrum CSV to fill it in.</p>
    <div class="mini-table">
      <div class="mini-table-scroll">
      <table>
        <thead><tr><th>#</th><th>A (abs.)</th><th>I (∫PL)</th><th colspan="2"></th></tr></thead>
        <tbody>
          {#each referencePoints as point, i}
            <tr>
              <td>Ref {i + 1}</td>
              <td><input type="number" step="any" placeholder="0.000" bind:value={point.absorbance} /></td>
              <td><input type="number" step="any" placeholder="0.0" bind:value={point.intensity} /></td>
              <td>
                <label class="upload-btn" title="Fill intensity from a PL_spectrum.csv">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
                  Upload
                  <input type="file" accept=".csv" hidden onchange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadIntensity(point, f); }} />
                </label>
              </td>
              <td><button type="button" class="row-remove" aria-label="Remove reference point {i + 1}" onclick={() => removePoint(referencePoints, i)}>✕</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
      </div>
      <button type="button" class="add-row" onclick={() => addPoint(referencePoints)}>+ add reference point</button>
    </div>
  </div>

  <div class="point-group">
    <div class="point-group-label">Sample points</div>
    <p class="point-group-hint">Same idea, for your sample.</p>
    <div class="mini-table">
      <div class="mini-table-scroll">
      <table>
        <thead><tr><th>#</th><th>A (abs.)</th><th>I (∫PL)</th><th colspan="2"></th></tr></thead>
        <tbody>
          {#each samplePoints as point, i}
            <tr>
              <td>Sample {i + 1}</td>
              <td><input type="number" step="any" placeholder="0.000" bind:value={point.absorbance} /></td>
              <td><input type="number" step="any" placeholder="0.0" bind:value={point.intensity} /></td>
              <td>
                <label class="upload-btn" title="Fill intensity from a PL_spectrum.csv">
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" /></svg>
                  Upload
                  <input type="file" accept=".csv" hidden onchange={(e) => { const f = (e.target as HTMLInputElement).files?.[0]; if (f) uploadIntensity(point, f); }} />
                </label>
              </td>
              <td><button type="button" class="row-remove" aria-label="Remove sample point {i + 1}" onclick={() => removePoint(samplePoints, i)}>✕</button></td>
            </tr>
          {/each}
        </tbody>
      </table>
      </div>
      <button type="button" class="add-row" onclick={() => addPoint(samplePoints)}>+ add sample point</button>
    </div>
  </div>

  <div class="field-row">
    <label class="field">n sample<input type="number" step="any" bind:value={sampleRefractiveIndex} /></label>
    <label class="field">n reference<input type="number" step="any" value={referenceRefractiveIndex.toFixed(4)} disabled /></label>
  </div>

  {#if error}
    <p class="qy-error">{error}</p>
  {/if}
  {#each warnings as w}
    <WarningBanner message={w} />
  {/each}

  <div class="qy-output">
    <span class="lbl">Φ sample</span>
    <span class="num">{result ? result.quantumYieldSample.toFixed(4) : '—'}</span>
  </div>
  <button class="btn-mini" onclick={compute}>Calculate Φ</button>
</CollapsibleStepCard>

<style>
  .step-sub {
    font-size: 13.5px;
    color: var(--ink-muted);
    line-height: 1.4;
    margin: 0;
  }
  .field-select {
    width: 100%;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 9px 10px;
    font: inherit;
    font-size: 13.5px;
    color: var(--ink);
    background: #fff;
  }
  .point-group {
    display: flex;
    flex-direction: column;
    gap: 6px;
  }
  .point-group-label {
    font-size: 13.5px;
    font-weight: 600;
    color: var(--ink-muted);
  }
  .point-group-hint {
    font-size: 12.5px;
    color: var(--ink-muted);
    margin: -4px 0 0;
    line-height: 1.4;
  }
  .mini-table {
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
    font-size: 13.5px;
  }
  /* The table itself can be wider than the card on narrow screens (five
     columns: #, A, I, Upload, Remove) -- scroll it horizontally instead of
     letting the outer .mini-table's overflow:hidden (there for the rounded
     corners) silently clip the Upload/Remove buttons out of reach. */
  .mini-table-scroll {
    overflow-x: auto;
  }
  .mini-table table {
    width: 100%;
    min-width: 300px;
    border-collapse: collapse;
  }
  .mini-table th {
    background: var(--alt);
    text-align: left;
    font-weight: 600;
    color: var(--ink-muted);
    padding: 6px 8px;
    font-size: 12.5px;
  }
  .mini-table td {
    padding: 6px 6px;
    border-top: 1px solid var(--line);
    font-family: 'JetBrains Mono', monospace;
    color: var(--ink-muted);
    white-space: nowrap;
  }
  .mini-table input[type='number'] {
    width: 100%;
    min-width: 44px;
    border: none;
    background: transparent;
    font: inherit;
    font-family: 'JetBrains Mono', monospace;
    color: var(--ink);
    font-size: 13.5px;
  }
  .mini-table input:focus {
    outline: none;
  }
  .upload-btn {
    display: inline-flex;
    align-items: center;
    gap: 4px;
    background: var(--accent-soft);
    color: var(--accent);
    border-radius: 7px;
    padding: 5px 8px;
    font-family: 'Archivo', sans-serif;
    font-size: 12.5px;
    font-weight: 700;
    cursor: pointer;
    white-space: nowrap;
  }
  .upload-btn:hover {
    background: var(--accent);
    color: #fff;
  }
  .upload-btn svg {
    width: 14px;
    height: 14px;
    flex: none;
  }
  .row-remove {
    color: var(--ink-muted);
    cursor: pointer;
    background: none;
    border: none;
    font: inherit;
    font-size: 13.5px;
    padding: 4px;
  }
  .add-row {
    display: block;
    width: 100%;
    color: var(--accent);
    font-weight: 700;
    cursor: pointer;
    text-align: center;
    padding: 8px;
    font-family: 'Archivo', sans-serif;
    font-size: 13.5px;
    background: none;
    border: none;
    border-top: 1px dashed var(--line);
  }
  .field-row {
    display: flex;
    gap: 8px;
  }
  .field {
    flex: 1;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 8px 10px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    font-size: 13.5px;
    color: var(--ink-muted);
    font-weight: 600;
    cursor: text;
  }
  .field input {
    border: none;
    background: transparent;
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    color: var(--ink);
    padding: 0;
    width: 100%;
  }
  .field input:disabled {
    color: var(--ink-muted);
  }
  .qy-error {
    font-size: 13.5px;
    color: var(--error);
    margin: 0;
  }
  .qy-output {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: var(--alt);
    border: 1px dashed var(--line);
    border-radius: 8px;
    padding: 10px 12px;
  }
  .qy-output .lbl {
    font-size: 13.5px;
    color: var(--ink-muted);
    font-weight: 700;
  }
  .qy-output .num {
    font-family: 'JetBrains Mono', monospace;
    font-weight: 700;
    color: var(--ink);
    font-size: 16px;
  }
  .btn-mini {
    background: var(--accent);
    color: #fff;
    border: none;
    border-radius: 8px;
    padding: 10px;
    font-weight: 700;
    font-size: 14.5px;
    cursor: pointer;
  }
</style>
