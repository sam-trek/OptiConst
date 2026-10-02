<script lang="ts">
  import { niceTicks, tickStep } from '../lib/chartTicks';
  import type { ChartSeries } from '../lib/types';

  let {
    wl,
    series,
    mode,
    range,
    selectedId,
  }: {
    wl: number[];
    series: ChartSeries[];
    mode: 'a' | 'e';
    range: [number, number];
    selectedId: string;
  } = $props();

  let boxWidth = $state(0);
  let svg: SVGSVGElement | undefined;

  const W = $derived(Math.max(260, Math.floor(boxWidth - 24)));
  const narrow = $derived(W < 520);
  const H = $derived(narrow ? 270 : 340);
  const mL = $derived(narrow ? 56 : 62);
  const mR = 14;
  const mT = 28;
  const mB = $derived(narrow ? 52 : 56);
  const iw = $derived(W - mL - mR);
  const ih = $derived(H - mT - mB);

  const xMin = $derived(wl.length ? wl[0] : 0);
  const xMax = $derived(wl.length ? wl[wl.length - 1] : 1);

  const values = (s: ChartSeries) => (mode === 'a' ? s.a : s.e);
  const yMax = $derived.by(() => {
    let m = 0;
    for (const s of series) for (const v of values(s)) if (v > m) m = v;
    return (m || 1) * 1.05;
  });

  const X = (v: number) => mL + ((v - xMin) / (xMax - xMin || 1)) * iw;
  const Y = (v: number) => mT + ih - (v / yMax) * ih;

  const yTicksAll = $derived(niceTicks(0, yMax, 5));
  const yTicks = $derived(narrow ? yTicksAll.filter((_, i) => i % 2 === 0) : yTicksAll);
  const yDecimals = $derived.by(() => {
    const st = tickStep(yTicksAll);
    return st > 0 && st < 1 ? Math.max(0, -Math.floor(Math.log10(st))) : 0;
  });
  const yLabelText = (v: number) =>
    mode === 'a' ? v.toFixed(yDecimals) : v >= 1000 ? `${Number((v / 1000).toPrecision(4))}k` : String(v);

  const xTicksAll = $derived(niceTicks(xMin, xMax, 5));
  const xTicks = $derived(narrow ? xTicksAll.filter((_, i) => i % 2 === 0) : xTicksAll);

  const paths = $derived(
    series.map((s) => {
      const ys = values(s);
      const d = wl.map((w, j) => `${j ? 'L' : 'M'}${X(w).toFixed(1)} ${Y(ys[j]).toFixed(1)}`).join(' ');
      return { id: s.id, color: s.color, d };
    }),
  );

  const peak = $derived.by(() => {
    const s = series.find((x) => x.id === selectedId);
    if (!s) return null;
    const ys = values(s);
    let best = 0;
    for (let i = 1; i < ys.length; i++) if (ys[i] > ys[best]) best = i;
    return { x: wl[best], y: ys[best], color: s.color };
  });

  const shade = $derived.by(() => {
    const lo = Math.max(xMin, Math.min(range[0], range[1]));
    const hi = Math.min(xMax, Math.max(range[0], range[1]));
    return { x: X(lo), w: Math.max(0, X(hi) - X(lo)) };
  });

  const yAxisTitle = $derived(
    mode === 'a'
      ? narrow
        ? 'Absorbance'
        : 'Absorbance (as in file)'
      : narrow
        ? 'ε'
        : 'ε (L·mol⁻¹·cm⁻¹)',
  );

  /** Renders the current chart to a PNG data URL (for the PDF report). */
  export function toImageDataUrl(): Promise<{ url: string; aspect: number } | undefined> {
    return new Promise((resolve) => {
      if (!svg) return resolve(undefined);
      const xml = new XMLSerializer().serializeToString(svg);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = W * 2;
        canvas.height = H * 2;
        const ctx = canvas.getContext('2d');
        if (!ctx) return resolve(undefined);
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        ctx.scale(2, 2);
        ctx.drawImage(img, 0, 0, W, H);
        resolve({ url: canvas.toDataURL('image/png'), aspect: H / W });
      };
      img.onerror = () => resolve(undefined);
      img.src = 'data:image/svg+xml;charset=utf-8,' + encodeURIComponent(xml);
    });
  }
</script>

<div class="chartbox" bind:clientWidth={boxWidth}>
  <svg
    bind:this={svg}
    viewBox="0 0 {W} {H}"
    width={W}
    height={H}
    role="img"
    aria-label="Absorption spectra"
    xmlns="http://www.w3.org/2000/svg"
  >
    <rect x={shade.x} y={mT} width={shade.w} height={ih} fill="#0e8074" opacity="0.09" />
    {#each yTicks as v (v)}
      <line x1={mL} x2={W - mR} y1={Y(v)} y2={Y(v)} stroke="#e1e7e6" />
      <text
        x={mL - 8}
        y={Y(v) + 5}
        text-anchor="end"
        font-size="13"
        fill="#4f615e"
        font-family="JetBrains Mono, monospace">{yLabelText(v)}</text
      >
    {/each}
    {#each xTicks as v, i (v)}
      <line x1={X(v)} x2={X(v)} y1={mT + ih} y2={mT + ih + 5} stroke="#4f615e" />
      <text
        x={X(v)}
        y={mT + ih + 22}
        text-anchor={i === 0 ? 'start' : i === xTicks.length - 1 ? 'end' : 'middle'}
        font-size="13"
        fill="#4f615e"
        font-family="JetBrains Mono, monospace">{v}</text
      >
    {/each}
    <text
      x={mL + iw / 2}
      y={H - 6}
      text-anchor="middle"
      font-size="14"
      fill="#16211f"
      font-family="Archivo, sans-serif">Wavelength (nm)</text
    >
    <text
      transform="translate(15 {mT + ih / 2}) rotate(-90)"
      text-anchor="middle"
      font-size="14"
      fill="#16211f"
      font-family="Archivo, sans-serif">{yAxisTitle}</text
    >
    {#each paths as p (p.id)}
      <path
        d={p.d}
        fill="none"
        stroke={p.color}
        stroke-width={p.id === selectedId ? 2.8 : 1.8}
        opacity={p.id === selectedId ? 1 : 0.7}
      />
    {/each}
    {#if peak}
      <circle cx={X(peak.x)} cy={Y(peak.y)} r="4.5" fill={peak.color} />
      <text
        x={Math.min(X(peak.x) + 8, W - mR)}
        y={Y(peak.y) - 8}
        text-anchor={X(peak.x) + 110 > W ? 'end' : 'start'}
        font-size="13"
        fill={peak.color}
        font-weight="700"
        font-family="JetBrains Mono, monospace">{Math.round(peak.x)} nm</text
      >
    {/if}
  </svg>
</div>
<div class="leg">
  {#each series as s (s.id)}
    <span><i style="background:{s.color}"></i>{s.id}</span>
  {/each}
</div>
