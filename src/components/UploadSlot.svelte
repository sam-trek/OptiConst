<script lang="ts">
  import { parseSpectrumCsv, readFileAsText } from '../lib/csv';
  import type { Spectrum } from '../lib/types';

  let {
    title,
    subtitle,
    onLoaded,
  }: {
    title: string;
    subtitle: string;
    onLoaded: (spectrum: Spectrum | null, errors: string[], fileName: string | null) => void;
  } = $props();

  let fileName = $state<string | null>(null);
  let errors = $state<string[]>([]);
  let input: HTMLInputElement;

  async function handleChange(e: Event) {
    const file = (e.target as HTMLInputElement).files?.[0];
    if (!file) return;
    fileName = file.name;
    const text = await readFileAsText(file);
    const parsed = parseSpectrumCsv(text);
    errors = parsed.errors;
    onLoaded(parsed.spectrum, parsed.errors, file.name);
  }

  function clear() {
    fileName = null;
    errors = [];
    if (input) input.value = '';
    onLoaded(null, [], null);
  }
</script>

<button type="button" class="slot" class:has-error={errors.length > 0} onclick={() => input.click()}>
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 16V4" /><path d="M7 9l5-5 5 5" /><path d="M4 16v3a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2v-3" />
  </svg>
  <div class="slot-body">
    <div class="slot-title">{fileName ?? title}</div>
    <div class="slot-sub">{errors.length > 0 ? `${errors.length} problem row(s) — click to reupload` : subtitle}</div>
  </div>
  {#if fileName}
    <span
      class="clear"
      role="button"
      tabindex="0"
      onclick={(e) => { e.stopPropagation(); clear(); }}
      onkeydown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); clear(); } }}
    >✕</span>
  {/if}
</button>
<input bind:this={input} type="file" accept=".csv" hidden onchange={handleChange} />

{#if errors.length > 0}
  <ul class="errors">
    {#each errors.slice(0, 5) as err}
      <li>{err}</li>
    {/each}
    {#if errors.length > 5}
      <li>...and {errors.length - 5} more.</li>
    {/if}
  </ul>
{/if}

<style>
  .slot {
    width: 100%;
    border: 1px solid var(--line);
    background: var(--panel);
    border-radius: 10px;
    padding: 11px 13px;
    display: flex;
    gap: 10px;
    align-items: flex-start;
    text-align: left;
    cursor: pointer;
    font: inherit;
  }
  .slot.has-error {
    border-color: var(--error);
  }
  .slot svg {
    width: 17px;
    height: 17px;
    color: var(--accent);
    flex: none;
    margin-top: 1px;
  }
  .slot-body {
    flex: 1;
    min-width: 0;
  }
  .slot-title {
    font-size: 15px;
    font-weight: 600;
    color: var(--ink);
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .slot-sub {
    font-size: 13px;
    color: var(--ink-muted);
    margin-top: 3px;
  }
  .clear {
    color: var(--ink-muted);
    cursor: pointer;
    padding: 2px 4px;
  }
  .errors {
    margin: 6px 0 0;
    padding-left: 18px;
    font-size: 12.5px;
    color: var(--error);
  }
</style>
