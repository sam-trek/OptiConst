<script lang="ts">
  import AbsorptionChart from './AbsorptionChart.svelte';
  import ResultsTable from './ResultsTable.svelte';
  import WorkedSteps from './WorkedSteps.svelte';
  import {
    calculateAbsorptionSample,
    type AbsorbanceKind,
    type AbsorptionSampleResult,
    type SampleScale,
    type ScaleMode,
  } from '../lib/calculations/absorption';
  import { CONSTANT_PRESETS, EXACT_SI, type ConstantSet } from '../lib/constants';
  import { downloadText, resultMatrix, toCsv, toTsv } from '../lib/exporters';
  import { formatFixed, formatScientific } from '../lib/format';
  import { PAPER_SAMPLES, PAPER_SETTINGS, paperTable } from '../lib/paper';
  import { downloadReport } from '../lib/pdfReport';
  import { guessXUnit, readSpectrumFile, type SpectrumTable } from '../lib/spreadsheet';
  import type { ChartSeries, ResultRow, SpectralUnit } from '../lib/types';

  const PALETTE = ['#0e8074', '#d9822b', '#6a5acd', '#c2417f', '#2f7fc1', '#7a8f1f', '#b4271e', '#4b5563'];

  const SOLVENTS = [
    { id: 'chlorobenzene', label: 'Chlorobenzene', n: 1.524 },
    { id: '2-methf', label: '2-MeTHF', n: 1.4062 },
    { id: 'methanol', label: 'Methanol', n: 1.329 },
    { id: 'ethylene-glycol', label: 'Ethylene glycol', n: 1.4361 },
  ];

  interface SampleValues {
    emax: string;
    conc: string;
    molarMass: string;
  }

  // ----- state -----
  let table = $state<SpectrumTable | null>(null);
  let fileName = $state('');
  let loadErrors = $state<string[]>([]);
  let dragOver = $state(false);
  let absKind = $state<AbsorbanceKind>('normalised');
  let xUnit = $state<SpectralUnit>('wavelength');
  let selected = $state<string[]>([]);
  let rangeFrom = $state('500');
  let rangeTo = $state('800');
  let valueMode = $state<ScaleMode>('emax');
  let values = $state<Record<string, SampleValues>>({});
  let solventId = $state('chlorobenzene');
  let nText = $state('1.524');
  let pathText = $state('1');
  let constId = $state<ConstantSet['id']>('si');
  let customH = $state('6.62607015e-34');
  let customC = $state('299792458');
  let customNA = $state('6.02214076e23');
  let focusId = $state('');
  let chartMode = $state<'a' | 'e'>('a');
  let copied = $state(false);
  let busy = $state(false);

  let fileInput: HTMLInputElement | undefined;
  let resultsEl: HTMLDivElement | undefined;
  let chartRef = $state<AbsorptionChart>();

  const toNum = (t: string) => Number(t.trim().replace(',', '.'));
  const colorOf = (name: string) => {
    const i = table ? table.samples.findIndex((s) => s.name === name) : 0;
    return PALETTE[Math.max(0, i) % PALETTE.length];
  };

  // ----- loading -----
  function uniqueNames(names: string[]): string[] {
    const seen = new Map<string, number>();
    return names.map((n) => {
      const c = (seen.get(n) ?? 0) + 1;
      seen.set(n, c);
      return c === 1 ? n : `${n} (${c})`;
    });
  }

  function applyTable(t: SpectrumTable, name: string) {
    const names = uniqueNames(t.samples.map((s) => s.name));
    const fixed: SpectrumTable = {
      ...t,
      samples: t.samples.map((s, i) => ({ ...s, name: names[i] })),
    };
    table = fixed;
    fileName = name;
    loadErrors = [];
    xUnit = guessXUnit(fixed.x, fixed.xHeader);
    const peaks = fixed.samples.map((s) => Math.max(...s.values));
    absKind = peaks.every((p) => p > 0.98 && p < 1.02) ? 'normalised' : 'real';
    valueMode = absKind === 'normalised' ? 'emax' : 'conc';
    selected = names.slice(0, 8);
    values = Object.fromEntries(names.map((n) => [n, { emax: '', conc: '', molarMass: '' }]));
    focusId = names[0] ?? '';
    const [lo, hi] = dataRangeNm(fixed, xUnit);
    rangeFrom = String(Math.ceil(lo));
    rangeTo = String(Math.floor(hi));
  }

  function dataRangeNm(t: SpectrumTable, unit: SpectralUnit): [number, number] {
    const lo = Math.min(...t.x);
    const hi = Math.max(...t.x);
    return unit === 'wavelength' ? [lo, hi] : [1e7 / hi, 1e7 / lo];
  }

  async function handleFile(file: File | undefined) {
    if (!file) return;
    busy = true;
    const parsed = await readSpectrumFile(file);
    busy = false;
    if (!parsed.table) {
      loadErrors = parsed.errors;
      return;
    }
    applyTable(parsed.table, file.name);
  }

  function loadExample() {
    applyTable(paperTable(), 'Absorption Data.xls (paper example)');
    xUnit = 'wavelength';
    absKind = 'normalised';
    valueMode = 'emax';
    for (const s of PAPER_SAMPLES) {
      if (values[s.id]) values[s.id].emax = String(s.emax);
    }
    rangeFrom = String(PAPER_SETTINGS.rangeNm[0]);
    rangeTo = String(PAPER_SETTINGS.rangeNm[1]);
    solventId = 'chlorobenzene';
    nText = String(PAPER_SETTINGS.refractiveIndex);
    pathText = String(PAPER_SETTINGS.pathLength);
    constId = 'si';
  }

  function onDrop(e: DragEvent) {
    e.preventDefault();
    dragOver = false;
    void handleFile(e.dataTransfer?.files?.[0]);
  }

  function toggleSample(name: string) {
    if (selected.includes(name)) {
      if (selected.length > 1) selected = selected.filter((n) => n !== name);
    } else if (table) {
      selected = table.samples.map((s) => s.name).filter((n) => n === name || selected.includes(n));
    }
    if (!selected.includes(focusId)) focusId = selected[0] ?? '';
  }

  // ----- settings -----
  const effMode = $derived<ScaleMode>(absKind === 'normalised' ? 'emax' : valueMode);

  const dataNm = $derived<[number, number]>(table ? dataRangeNm(table, xUnit) : [400, 800]);

  const constants = $derived.by<ConstantSet>(() => {
    if (constId === 'custom') {
      return { id: 'custom', label: 'Custom', h: toNum(customH), c: toNum(customC), NA: toNum(customNA) };
    }
    return CONSTANT_PRESETS.find((c) => c.id === constId) ?? EXACT_SI;
  });

  function onSolvent(id: string) {
    solventId = id;
    const s = SOLVENTS.find((x) => x.id === id);
    if (s) nText = String(s.n);
  }
  function onNInput(text: string) {
    nText = text;
    const v = toNum(text);
    const match = SOLVENTS.find((x) => x.n === v);
    solventId = match ? match.id : 'custom';
  }

  const solventLabel = $derived(SOLVENTS.find((s) => s.id === solventId)?.label ?? 'Other solvent');

  // ----- calculation (re-runs whenever anything above changes) -----
  interface Detail {
    result: AbsorptionSampleResult;
    scale: SampleScale;
  }

  const calc = $derived.by(() => {
    const rows: ResultRow[] = [];
    const details: Record<string, Detail> = {};
    const errors: Record<string, string> = {};
    let settingsError: string | null = null;
    const from = toNum(rangeFrom);
    const to = toNum(rangeTo);
    const n = toNum(nText);
    const L = toNum(pathText);

    if (!table) return { rows, details, errors, settingsError, from, to, n, L };

    if (!(Number.isFinite(from) && Number.isFinite(to) && from < to)) {
      settingsError = 'Range: "From" must be a number smaller than "To".';
    } else if (!(n > 0)) {
      settingsError = 'Enter a refractive index greater than 0.';
    } else if (!(L > 0)) {
      settingsError = 'Enter a path length greater than 0.';
    } else if (!(constants.h > 0 && constants.c > 0 && constants.NA > 0)) {
      settingsError = 'Each constant must be a number greater than 0.';
    }
    if (settingsError) return { rows, details, errors, settingsError, from, to, n, L };

    for (const s of table.samples) {
      if (!selected.includes(s.name)) continue;
      const v = values[s.name];
      if (!v) continue;
      const scale: SampleScale =
        effMode === 'emax'
          ? { mode: 'emax', emax: toNum(v.emax) }
          : { mode: 'conc', massConc: toNum(v.conc), molarMass: toNum(v.molarMass) };
      try {
        const result = calculateAbsorptionSample(table.x, s.values, scale, {
          xUnit,
          rangeNm: [from, to],
          refractiveIndex: n,
          pathLength: L,
          constants,
        });
        details[s.name] = { result, scale };
        rows.push({
          id: s.name,
          color: colorOf(s.name),
          solvent: solventLabel,
          peakWavenumber: result.peakWavenumber,
          epsMax: result.maxEpsilon,
          rangeLo: result.rangeWavenumber[0],
          rangeHi: result.rangeWavenumber[1],
          integralOverNu: result.integralEpsilonOverNu,
          b12: result.b12,
          mu: result.transitionDipoleMoment,
          f12: result.oscillatorStrength,
        });
      } catch (e) {
        errors[s.name] = e instanceof Error ? e.message : String(e);
      }
    }
    return { rows, details, errors, settingsError, from, to, n, L };
  });

  const activeId = $derived(
    calc.details[focusId] ? focusId : (calc.rows[0]?.id ?? ''),
  );

  const chartData = $derived.by(() => {
    if (!table) return { wl: [] as number[], series: [] as ChartSeries[] };
    const wlAll = xUnit === 'wavelength' ? table.x : table.x.map((x) => 1e7 / x);
    const order = wlAll.map((_, i) => i).sort((a, b) => wlAll[a] - wlAll[b]);
    const wl = order.map((i) => wlAll[i]);
    const series: ChartSeries[] = table.samples
      .filter((s) => selected.includes(s.name))
      .map((s) => ({
        id: s.name,
        color: colorOf(s.name),
        a: order.map((i) => s.values[i]),
        e: calc.details[s.name]
          ? calc.details[s.name].result.epsilonSpectrum.epsilon
          : order.map(() => 0),
      }));
    return { wl, series };
  });

  const chartSeries = $derived(
    chartMode === 'a' ? chartData.series : chartData.series.filter((s) => calc.details[s.id]),
  );

  const chartRange = $derived<[number, number]>(
    Number.isFinite(calc.from) && Number.isFinite(calc.to) ? [calc.from, calc.to] : dataNm,
  );

  const trackLeft = $derived(
    Math.min(100, Math.max(0, ((chartRange[0] - dataNm[0]) / (dataNm[1] - dataNm[0] || 1)) * 100)),
  );
  const trackWidth = $derived(
    Math.min(
      100 - trackLeft,
      Math.max(0, ((chartRange[1] - chartRange[0]) / (dataNm[1] - dataNm[0] || 1)) * 100),
    ),
  );
  const convText = $derived(
    Number.isFinite(calc.from) && Number.isFinite(calc.to) && calc.from > 0 && calc.to > 0
      ? `${formatFixed(1e7 / Math.max(calc.from, calc.to) / 1e3, 2)} – ${formatFixed(1e7 / Math.min(calc.from, calc.to) / 1e3, 2)}`
      : '—',
  );

  const showPaperPreset = $derived(dataNm[0] <= 500 && dataNm[1] >= 800);
  const wholeKey = $derived(`${Math.ceil(dataNm[0])},${Math.floor(dataNm[1])}`);
  const rangeKey = $derived(`${rangeFrom},${rangeTo}`);

  function setRange(a: number, b: number) {
    rangeFrom = String(a);
    rangeTo = String(b);
  }

  const caption = $derived(
    `${calc.rows.length} sample${calc.rows.length === 1 ? '' : 's'} · ${solventLabel} · n = ${nText} · ${rangeFrom}–${rangeTo} nm`,
  );

  const errorList = $derived(Object.entries(calc.errors));

  // ----- actions -----
  function showResults() {
    resultsEl?.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  async function copyTable() {
    try {
      await navigator.clipboard.writeText(toTsv(resultMatrix(calc.rows)));
      copied = true;
      setTimeout(() => (copied = false), 2000);
    } catch {
      copied = false;
    }
  }

  function downloadCsv() {
    downloadText('opticonst-results.csv', toCsv(resultMatrix(calc.rows)));
  }

  async function downloadPdf() {
    const img = await chartRef?.toImageDataUrl();
    const parameters = [
      { label: 'File', value: fileName },
      { label: 'Numbers in the file', value: absKind === 'normalised' ? 'Normalised (peak = 1)' : 'Real absorbance' },
      { label: 'Wavelength range', value: `${rangeFrom}–${rangeTo} nm` },
      { label: 'Solvent / refractive index n', value: `${solventLabel} / ${nText}` },
      { label: 'Path length', value: `${pathText} cm` },
      { label: 'Constants', value: `${constants.label} — h ${constants.h}, c ${constants.c}, Nₐ ${constants.NA}` },
    ];
    for (const r of calc.rows) {
      const sc = calc.details[r.id].scale;
      parameters.push({
        label: `${r.id} scale`,
        value:
          sc.mode === 'emax'
            ? `ε max = ${sc.emax} L·mol⁻¹·cm⁻¹`
            : `c = ${sc.massConc} mg/mL, M = ${sc.molarMass} g/mol`,
      });
    }
    const results = calc.rows.flatMap((r) => [
      { label: `${r.id} — ν̃ peak`, value: `${(r.peakWavenumber / 1e3).toFixed(2)} ×10³ cm⁻¹`, formula: 'wavenumber of the tallest point' },
      { label: `${r.id} — ε max`, value: `${(r.epsMax / 1e3).toFixed(1)} ×10³`, formula: 'L·mol⁻¹·cm⁻¹' },
      { label: `${r.id} — ∫ε/ν̃ dν̃`, value: `${(r.integralOverNu / 1e3).toFixed(2)} ×10³`, formula: 'trapezoid rule over the range' },
      { label: `${r.id} — B₁₂`, value: formatScientific(r.b12, 4), formula: 'ln(10)·1000·c/(h·n·Nₐ) × ∫ε/ν̃ dν̃' },
      { label: `${r.id} — μ`, value: formatScientific(r.mu, 4), formula: '√(2h²·B₁₂/8π³)' },
      { label: `${r.id} — f₁₂`, value: formatFixed(r.f12, 3), formula: '4.39e-9 · ∫ε dν̃ / n' },
    ]);
    downloadReport({
      title: 'OptiConst — Absorption Report',
      inputMode: xUnit === 'wavelength' ? 'Wavelength (nm)' : 'Wavenumber (cm⁻¹)',
      parameters,
      results,
      warnings: errorList.map(([id, msg]) => `${id}: ${msg}`),
      chartImageDataUrl: img?.url,
      chartImageAspect: img?.aspect,
    });
  }
</script>

<section class="layout">
  <aside class="rail">
    <!-- 1 · upload -->
    <div class="card active" class:done={!!table}>
      <div class="card-head"><span class="stepno">1</span>Upload your spectrum</div>
      <div class="hint">One file: a wavelength column, then one column per sample.</div>

      <input
        bind:this={fileInput}
        type="file"
        accept=".csv,.tsv,.txt,.xls,.xlsx"
        hidden
        onchange={(e) => {
          void handleFile(e.currentTarget.files?.[0]);
          e.currentTarget.value = '';
        }}
      />

      {#if !table}
        <div
          class="drop"
          class:over={dragOver}
          role="group"
          aria-label="File drop area"
          ondragover={(e) => {
            e.preventDefault();
            dragOver = true;
          }}
          ondragleave={() => (dragOver = false)}
          ondrop={onDrop}
        >
          <strong>{busy ? 'Reading file…' : 'Drop a CSV or Excel file here'}</strong>
          .csv · .xls · .xlsx
          <div><button type="button" class="btn" onclick={() => fileInput?.click()}>Browse files</button></div>
          <div style="margin-top: var(--s2)">
            <button type="button" class="link" onclick={loadExample}>or load the paper's example data</button>
          </div>
        </div>
      {:else}
        <div class="stack-sm">
          <div class="file">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"
              ><path d="M14 3H7a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2V8z" /><path d="M14 3v5h5M9 13h6M9 17h6" /></svg
            >
            <div class="grow">
              <div class="nm">{fileName}</div>
              <div class="meta">
                {table.x.length} rows · {Math.round(dataNm[0])}–{Math.round(dataNm[1])} nm · {table.samples.length}
                sample{table.samples.length === 1 ? '' : 's'} found
              </div>
            </div>
            <button type="button" class="link" onclick={() => fileInput?.click()}>Replace</button>
          </div>
          <div>
            <div class="cap-lbl">What do the numbers mean?</div>
            <div class="seg2">
              <button type="button" class:on={absKind === 'real'} onclick={() => (absKind = 'real')}>Real absorbance</button>
              <button type="button" class:on={absKind === 'normalised'} onclick={() => (absKind = 'normalised')}>Normalised (peak = 1)</button>
            </div>
          </div>
          <div>
            <div class="cap-lbl">First column is</div>
            <div class="seg2">
              <button type="button" class:on={xUnit === 'wavelength'} onclick={() => (xUnit = 'wavelength')}>Wavelength (nm)</button>
              <button type="button" class:on={xUnit === 'wavenumber'} onclick={() => (xUnit = 'wavenumber')}>Wavenumber (cm⁻¹)</button>
            </div>
          </div>
          {#if absKind === 'normalised'}
            <div class="note"><span>ⓘ</span><span>Normalised data has no real scale, so step 3 asks for each sample's ε max.</span></div>
          {/if}
        </div>
      {/if}

      {#if loadErrors.length > 0}
        <div class="note bad" role="alert">
          <span>!</span>
          <span>{loadErrors.join(' ')}</span>
        </div>
      {/if}
    </div>

    {#if table}
      <!-- 2 · samples and range -->
      <div class="card done">
        <div class="card-head"><span class="stepno">2</span>Choose samples and range</div>
        <div class="chips">
          {#each table.samples as s (s.name)}
            <button
              type="button"
              class="chip"
              class:on={selected.includes(s.name)}
              style="--c:{colorOf(s.name)}"
              aria-pressed={selected.includes(s.name)}
              onclick={() => toggleSample(s.name)}><i></i>{s.name}</button
            >
          {/each}
        </div>
        <div>
          <div class="cap-lbl">Wavelength range to include</div>
          <div class="range">
            <div class="fld">
              <label for="rFrom">From (nm)</label>
              <input id="rFrom" bind:value={rangeFrom} inputmode="decimal" />
            </div>
            <span class="muted">to</span>
            <div class="fld">
              <label for="rTo">To (nm)</label>
              <input id="rTo" bind:value={rangeTo} inputmode="decimal" />
            </div>
          </div>
          <div class="track"><div class="win" style="left:{trackLeft}%;width:{trackWidth}%"></div></div>
          <div class="track-scale">
            <span>{Math.round(dataNm[0])}</span>
            <span>{Math.round((dataNm[0] + dataNm[1]) / 2)}</span>
            <span>{Math.round(dataNm[1])}</span>
          </div>
          <div class="conv" style="margin-top: var(--s2)">That is <b>{convText}</b> ×10³ cm⁻¹</div>
        </div>
        <div class="chips">
          <button
            type="button"
            class="chip plain"
            class:on={rangeKey === wholeKey}
            onclick={() => setRange(Math.ceil(dataNm[0]), Math.floor(dataNm[1]))}>Whole file</button
          >
          {#if showPaperPreset}
            <button type="button" class="chip plain" class:on={rangeKey === '500,800'} onclick={() => setRange(500, 800)}
              >Main band (paper) 500–800</button
            >
          {/if}
        </div>
      </div>

      <!-- 3 · sample values -->
      <div class="card done">
        <div class="card-head"><span class="stepno">3</span>Sample values</div>
        <div class="hint">Edit any value and the results update.</div>
        <div class="seg2">
          <button type="button" class:on={effMode === 'emax'} onclick={() => (valueMode = 'emax')}>I know ε max</button>
          <button
            type="button"
            class:on={effMode === 'conc'}
            disabled={absKind === 'normalised'}
            title={absKind === 'normalised' ? 'Normalised data needs ε max' : ''}
            onclick={() => (valueMode = 'conc')}>I know concentration</button
          >
        </div>
        <div class="edit">
          <table>
            <thead>
              <tr>
                <th>Sample</th>
                {#if effMode === 'emax'}
                  <th class="r">ε max (L·mol⁻¹·cm⁻¹)</th>
                {:else}
                  <th class="r">Conc. (mg/mL)</th>
                  <th class="r">Molar mass (g/mol)</th>
                {/if}
              </tr>
            </thead>
            <tbody>
              {#each table.samples.filter((s) => selected.includes(s.name)) as s (s.name)}
                <tr>
                  <td class="nm" style="--c:{colorOf(s.name)}"><i></i>{s.name}</td>
                  {#if effMode === 'emax'}
                    <td>
                      <input
                        aria-label="{s.name} epsilon max"
                        bind:value={values[s.name].emax}
                        inputmode="decimal"
                        placeholder="e.g. 204800"
                      />
                    </td>
                  {:else}
                    <td>
                      <input
                        aria-label="{s.name} concentration"
                        bind:value={values[s.name].conc}
                        inputmode="decimal"
                        placeholder="0.01"
                      />
                    </td>
                    <td>
                      <input
                        aria-label="{s.name} molar mass"
                        bind:value={values[s.name].molarMass}
                        inputmode="decimal"
                        placeholder="1427.94"
                      />
                    </td>
                  {/if}
                </tr>
              {/each}
            </tbody>
          </table>
        </div>
        <div class="two">
          <div class="fld">
            <label for="solvent">Solvent</label>
            <select id="solvent" value={solventId} onchange={(e) => onSolvent(e.currentTarget.value)}>
              {#each SOLVENTS as s (s.id)}
                <option value={s.id}>{s.label}</option>
              {/each}
              <option value="custom">Other…</option>
            </select>
          </div>
          <div class="fld">
            <label for="nIdx">Refractive index n</label>
            <input id="nIdx" value={nText} oninput={(e) => onNInput(e.currentTarget.value)} inputmode="decimal" />
          </div>
        </div>
        <div class="two">
          <div class="fld">
            <label for="pl">Path length (cm)</label>
            <input id="pl" bind:value={pathText} inputmode="decimal" />
          </div>
        </div>
      </div>

      <!-- 4 · constants -->
      <details class="card adv">
        <summary>
          <span class="stepno">4</span>Constants <span class="sm">{constId === 'si' ? 'exact SI values' : constants.label}</span>
          <span class="chev">▸</span>
        </summary>
        <div class="body">
          <div class="fld">
            <label for="cs">Use constants from</label>
            <select id="cs" bind:value={constId}>
              {#each CONSTANT_PRESETS as c (c.id)}
                <option value={c.id}>{c.label}</option>
              {/each}
              <option value="custom">Custom…</option>
            </select>
          </div>
          {#if constId === 'custom'}
            <div class="two">
              <div class="fld"><label for="ch">h (J·s)</label><input id="ch" bind:value={customH} inputmode="decimal" /></div>
              <div class="fld"><label for="cc">c (m/s)</label><input id="cc" bind:value={customC} inputmode="decimal" /></div>
            </div>
            <div class="fld"><label for="cn">Avogadro Nₐ (1/mol)</label><input id="cn" bind:value={customNA} inputmode="decimal" /></div>
          {:else}
            <div class="two">
              <div class="fld"><label for="ch2">h (J·s)</label><input id="ch2" value={constants.h} readonly /></div>
              <div class="fld"><label for="cc2">c (m/s)</label><input id="cc2" value={constants.c} readonly /></div>
            </div>
            <div class="fld"><label for="cn2">Avogadro Nₐ (1/mol)</label><input id="cn2" value={constants.NA} readonly /></div>
          {/if}
        </div>
      </details>

      <button type="button" class="btn big" onclick={showResults}>Calculate</button>
      <div class="fine" style="text-align: center; margin-top: calc(var(--s2) * -1)">Results also update as you type.</div>
    {/if}
  </aside>

  <main class="cmain">
    {#if !table}
      <div class="empty-hero">
        <h2>Start by uploading a spectrum</h2>
        <p>
          Drop an absorbance file on the left. You get a results table and a graph, and you can see how every
          number was worked out.
        </p>
        <button type="button" class="btn ghost" onclick={loadExample}>Load the paper's example data</button>
        <div class="steps-pre">
          <span><b>1</b> Upload</span><span>→</span><span><b>2</b> Pick samples &amp; range</span><span>→</span><span
            ><b>3</b> Check values</span
          ><span>→</span><span><b>4</b> Read results</span>
        </div>
      </div>
    {:else}
      <div class="stack" bind:this={resultsEl}>
        <div class="h-row">
          <h2>Results</h2>
          <span class="cap">{caption}</span>
          <div class="acts">
            <button type="button" class="btn light" disabled={calc.rows.length === 0} onclick={copyTable}
              >{copied ? 'Copied ✓' : 'Copy table'}</button
            >
            <button type="button" class="btn light" disabled={calc.rows.length === 0} onclick={downloadCsv}>Download CSV</button>
            <button type="button" class="btn ghost" disabled={calc.rows.length === 0} onclick={downloadPdf}>PDF report</button>
          </div>
        </div>

        {#if calc.settingsError}
          <div class="note bad" role="alert"><span>!</span><span>{calc.settingsError}</span></div>
        {/if}
        {#each errorList as [id, msg] (id)}
          <div class="note warn"><span>ⓘ</span><span><b>{id}:</b> {msg}</span></div>
        {/each}

        {#if calc.rows.length > 0}
          <ResultsTable rows={calc.rows} selectedId={activeId} onSelect={(id) => (focusId = id)} />
          <div class="fine">
            Tap a sample to see how its numbers were worked out. The icons in the column headings explain each column
            in plain words.
          </div>
        {:else if !calc.settingsError}
          <div class="note"><span>ⓘ</span><span>Fill in the values in step 3 to see the results table.</span></div>
        {/if}

        <div class="panel">
          <div class="panel-h">
            <h3>Spectrum</h3>
            <span class="fine">Shaded area = part used in the calculation</span>
            <div class="tabs">
              <button type="button" class="tab" class:on={chartMode === 'a'} onclick={() => (chartMode = 'a')}>Absorbance</button>
              <button type="button" class="tab" class:on={chartMode === 'e'} onclick={() => (chartMode = 'e')}>ε (L·mol⁻¹·cm⁻¹)</button>
            </div>
          </div>
          <AbsorptionChart
            bind:this={chartRef}
            wl={chartData.wl}
            series={chartSeries}
            mode={chartMode}
            range={chartRange}
            selectedId={activeId}
          />
        </div>

        {#if activeId && calc.details[activeId]}
          <WorkedSteps
            id={activeId}
            result={calc.details[activeId].result}
            scale={calc.details[activeId].scale}
            rangeNm={[calc.from, calc.to]}
            refractiveIndex={calc.n}
          />
        {/if}
      </div>
    {/if}
  </main>
</section>
