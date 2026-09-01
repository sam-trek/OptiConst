<script lang="ts">
  import Plotly from 'plotly.js-dist-min';

  export interface Trace {
    x: number[];
    y: number[];
    name: string;
    color: string;
  }

  let {
    traces,
    xLabel,
    yLabel,
  }: { traces: Trace[]; xLabel: string; yLabel: string } = $props();

  let div: HTMLDivElement;

  $effect(() => {
    if (!div) return;
    const data = traces.map((t) => ({
      x: t.x,
      y: t.y,
      name: t.name,
      type: 'scatter' as const,
      mode: 'lines' as const,
      line: { color: t.color, width: 2.5 },
    }));
    Plotly.react(
      div,
      data,
      {
        margin: { l: 56, r: 16, t: 8, b: 44 },
        xaxis: { title: { text: xLabel }, gridcolor: '#E1E7E6' },
        yaxis: { title: { text: yLabel }, gridcolor: '#E1E7E6' },
        paper_bgcolor: 'transparent',
        plot_bgcolor: 'transparent',
        font: { family: 'Archivo, system-ui, sans-serif', color: '#5C6E6B', size: 11 },
        showlegend: traces.length > 1,
        legend: { orientation: 'h', y: 1.15 },
        dragmode: 'pan',
      },
      { displayModeBar: false, responsive: true, scrollZoom: true },
    );
  });

  const ZOOM_FACTOR = 0.65;

  function zoomBy(factor: number) {
    if (!div) return;
    const fullLayout = (div as unknown as { _fullLayout: PlotlyAxisLayout })._fullLayout;
    const [x0, x1] = fullLayout.xaxis.range;
    const [y0, y1] = fullLayout.yaxis.range;
    const xc = (x0 + x1) / 2;
    const yc = (y0 + y1) / 2;
    const xh = ((x1 - x0) * factor) / 2;
    const yh = ((y1 - y0) * factor) / 2;
    Plotly.relayout(div, {
      'xaxis.range': [xc - xh, xc + xh],
      'yaxis.range': [yc - yh, yc + yh],
    });
  }

  export function zoomIn(): void {
    zoomBy(ZOOM_FACTOR);
  }

  export function zoomOut(): void {
    zoomBy(1 / ZOOM_FACTOR);
  }

  export function resetZoom(): void {
    if (!div) return;
    Plotly.relayout(div, { 'xaxis.autorange': true, 'yaxis.autorange': true });
  }

  interface PlotlyAxisLayout {
    xaxis: { range: [number, number] };
    yaxis: { range: [number, number] };
  }

  export async function toImageDataUrl(): Promise<string | undefined> {
    if (!div) return undefined;
    return Plotly.toImage(div, { format: 'png', width: 900, height: 380 });
  }

  // Plotly's own "responsive" resize detection doesn't reliably fire when a
  // flex sibling grows/shrinks the chart's container (e.g. the "All computed
  // values" panel opening) rather than the window itself — so watch the
  // container directly and keep the plot's SVG in sync with it. Without
  // this the chart kept its old bounds and visually overlapped whatever
  // rendered below it.
  //
  // Plotly.Plots.resize() fully re-lays-out and redraws the traces, which
  // isn't cheap — calling it on every single ResizeObserver tick during a
  // ~260ms CSS transition (a dozen-plus ticks) was the source of the visible
  // lag/jank. Throttled here to a few updates during the animation, plus a
  // trailing call so the chart still lands on the exact final size.
  $effect(() => {
    if (!div) return;
    const THROTTLE_MS = 100;
    let lastCall = 0;
    let trailingTimer: ReturnType<typeof setTimeout> | undefined;

    const doResize = () => {
      lastCall = Date.now();
      Plotly.Plots.resize(div);
    };

    const observer = new ResizeObserver(() => {
      clearTimeout(trailingTimer);
      if (Date.now() - lastCall >= THROTTLE_MS) {
        doResize();
      } else {
        trailingTimer = setTimeout(doResize, THROTTLE_MS);
      }
    });
    observer.observe(div);
    return () => {
      observer.disconnect();
      clearTimeout(trailingTimer);
    };
  });
</script>

<div class="chart-wrap">
  <div class="chart" bind:this={div}></div>
  <div class="zoom-controls">
    <button type="button" onclick={() => zoomIn()} aria-label="Zoom in" title="Zoom in">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M12 5v14M5 12h14" /></svg>
    </button>
    <button type="button" onclick={() => zoomOut()} aria-label="Zoom out" title="Zoom out">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><path d="M5 12h14" /></svg>
    </button>
    <button type="button" onclick={() => resetZoom()} aria-label="Reset zoom" title="Reset zoom">
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
        <path d="M3 12a9 9 0 1 1 2.64 6.36" /><path d="M3 21v-6h6" />
      </svg>
    </button>
  </div>
</div>

<style>
  .chart-wrap {
    position: relative;
    width: 100%;
    height: 100%;
    min-height: 220px;
  }
  .chart {
    width: 100%;
    height: 100%;
  }
  .zoom-controls {
    position: absolute;
    top: 4px;
    right: 4px;
    display: flex;
    flex-direction: column;
    gap: 2px;
    background: var(--panel);
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 3px;
    box-shadow: 0 1px 3px rgba(22, 33, 31, 0.08);
  }
  .zoom-controls button {
    width: 26px;
    height: 26px;
    display: flex;
    align-items: center;
    justify-content: center;
    border: none;
    background: transparent;
    border-radius: 5px;
    color: var(--ink-muted);
    cursor: pointer;
    padding: 0;
    transition: background 120ms ease, color 120ms ease;
  }
  .zoom-controls button:hover {
    background: var(--accent-soft);
    color: var(--accent);
  }
  .zoom-controls button svg {
    width: 14px;
    height: 14px;
  }
</style>
