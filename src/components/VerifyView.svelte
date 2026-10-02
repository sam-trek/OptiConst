<script lang="ts">
  import { formatFixed, formatScientific } from '../lib/format';
  import {
    PAPER_SAMPLES,
    PAPER_SETTINGS,
    QUANTITIES,
    WAITING_SAMPLES,
    runPaperExample,
    verifyAgainstPaper,
    type QuantityKey,
    type VerifyRow,
  } from '../lib/paper';

  let { onOpenCalculator }: { onOpenCalculator: () => void } = $props();

  const TOLERANCES = [0.5, 1, 2];
  let tol = $state(1);

  const results = runPaperExample();
  const summary = $derived(verifyAgainstPaper(results, tol));

  const sampleColor = (id: string) => PAPER_SAMPLES.find((s) => s.id === id)?.color ?? '#0e8074';
  const rowsFor = (id: string) => summary.rows.filter((r) => r.sampleId === id);
  const fixedRows = $derived(summary.rows.filter((r) => r.fix));

  function fmt(key: QuantityKey, v: number): string {
    if (key === 'integral') return formatFixed(v, 2);
    if (key === 'f12') return formatFixed(v, 3);
    return formatScientific(v, 4);
  }
  const usedText = (r: VerifyRow) => (r.fix && r.quantity === 'integral' ? '≈ 31.7' : fmt(r.quantity, r.used));
  const diffText = (r: VerifyRow) => `${r.diffPct > 0 ? '+' : ''}${r.diffPct.toFixed(2)}%`;
  const statusLabel = (r: VerifyRow) =>
    r.status === 'match' ? '✓ Match' : r.status === 'fixed' ? '✎ Typo fixed' : '✕ Differs';
  const statusClass = (r: VerifyRow) => (r.status === 'match' ? 'ok' : r.status === 'fixed' ? 'fix' : 'bad');
  const diffColor = (r: VerifyRow) => (r.withinTolerance ? 'var(--ok)' : 'var(--err)');
</script>

<div class="vwrap">
  <div class="hero">
    <div class="big-n" class:warn={summary.passed !== summary.total}>
      <span>{summary.passed}</span><small> / {summary.total}</small>
    </div>
    <div>
      <h2>Values reproduced within ±{tol}% of the paper</h2>
      <p>
        The tool was run on the client's own absorption data and compared with the "ITIC derivatives" table (Zijun
        Shen report, slide 27).
      </p>
      <div class="src">
        <span class="pill">Data: <b>Absorption Data.xls</b></span>
        <span class="pill">Samples: <b>{PAPER_SAMPLES.map((s) => s.id).join(' · ')}</b></span>
        <span class="pill">Range: <b>{PAPER_SETTINGS.rangeNm[0]}–{PAPER_SETTINGS.rangeNm[1]} nm</b></span>
        <span class="pill">n = <b>{PAPER_SETTINGS.refractiveIndex}</b> ({PAPER_SETTINGS.solvent.toLowerCase()})</span>
        <span class="pill">Constants: <b>exact SI</b></span>
      </div>
    </div>
  </div>

  <div class="tolrow">
    <span class="cap-lbl" style="margin: 0">Tolerance</span>
    <div class="seg2">
      {#each TOLERANCES as t (t)}
        <button type="button" class:on={tol === t} onclick={() => (tol = t)}>±{t}%</button>
      {/each}
    </div>
    <span class="fine">Paper values are rounded, so tiny differences are expected.</span>
  </div>

  <div class="vbox">
    <div class="vtable">
      <table class="v">
        <thead>
          <tr>
            <th>Sample / quantity</th>
            <th>Paper (printed)</th>
            <th>Paper (used)</th>
            <th>This tool</th>
            <th>Difference</th>
            <th style="text-align: center">Status</th>
          </tr>
        </thead>
        <tbody>
          {#each PAPER_SAMPLES as s (s.id)}
            <tr class="grp" style="--c:{s.color}">
              <td colspan="6"><i class="dotc"></i>{s.id}</td>
            </tr>
            {#each rowsFor(s.id) as r (r.quantity)}
              <tr>
                <td>{r.label}</td>
                <td class:strike={!!r.fix}>{r.printed}</td>
                <td>{usedText(r)}</td>
                <td><b>{fmt(r.quantity, r.tool)}</b></td>
                <td style="color: {diffColor(r)}">{diffText(r)}</td>
                <td style="text-align: center"
                  ><span class="st {statusClass(r)}" title={r.fix ?? ''}>{statusLabel(r)}</span></td
                >
              </tr>
            {/each}
          {/each}
        </tbody>
      </table>
    </div>

    <div class="v-cards">
      {#each PAPER_SAMPLES as s (s.id)}
        <div class="vg" style="--c:{s.color}">
          <div class="vg-h"><i class="dotc"></i>{s.id}</div>
          {#each rowsFor(s.id) as r (r.quantity)}
            <div class="vr">
              <div class="vr-top">
                <b>{r.label}</b>
                <span class="st {statusClass(r)}">{statusLabel(r)}</span>
              </div>
              <dl class="kv">
                <div><dt>Paper (printed)</dt><dd class:strike={!!r.fix}>{r.printed}</dd></div>
                <div><dt>Paper (used)</dt><dd>{usedText(r)}</dd></div>
                <div><dt>This tool</dt><dd>{fmt(r.quantity, r.tool)}</dd></div>
                <div><dt>Difference</dt><dd style="color: {diffColor(r)}">{diffText(r)}</dd></div>
              </dl>
            </div>
          {/each}
        </div>
      {/each}
    </div>
  </div>

  {#if fixedRows.length > 0}
    <div class="callout">
      <h3>{fixedRows.length === 1 ? 'A typo' : `${fixedRows.length} typos`} in the paper's table, fixed</h3>
      {#each fixedRows as r (r.sampleId + r.quantity)}
        <p><b>{r.sampleId}, {r.label}:</b> printed as {r.printed}. {r.fix}</p>
      {/each}
      <p>Both are marked in amber so the client can confirm them.</p>
    </div>
  {/if}

  <div class="wait">
    <h3>{WAITING_SAMPLES.length} more samples are waiting for data</h3>
    <p>Their paper values are already saved. Add their absorbance data to run the same check.</p>
    <div class="w-cards">
      {#each WAITING_SAMPLES as w (w.id)}
        <div class="wc">
          <b>{w.id}</b>
          <dl class="kv">
            <div><dt>{QUANTITIES[0].label}</dt><dd>{w.integral}</dd></div>
            <div><dt>B₁₂</dt><dd>{w.b12}</dd></div>
            <div><dt>μ</dt><dd>{w.mu}</dd></div>
            <div><dt>f₁₂</dt><dd>{w.f12}</dd></div>
          </dl>
        </div>
      {/each}
    </div>
    <div style="margin-top: var(--s4)">
      <button type="button" class="btn ghost" onclick={onOpenCalculator}>Open the calculator to add data</button>
    </div>
  </div>
</div>
