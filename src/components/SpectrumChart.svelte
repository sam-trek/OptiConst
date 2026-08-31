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
      },
      { displayModeBar: false, responsive: true },
    );
  });

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

<div class="chart" bind:this={div}></div>

<style>
  .chart {
    width: 100%;
    height: 100%;
    min-height: 220px;
  }
</style>
