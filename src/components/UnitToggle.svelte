<script lang="ts">
  import type { SpectralUnit } from '../lib/types';

  let { value = $bindable('wavelength' as SpectralUnit) }: { value?: SpectralUnit } = $props();
</script>

<div class="rocker">
  <button class:on={value === 'wavelength'} onclick={() => (value = 'wavelength')}>nm</button>
  <button class:on={value === 'wavenumber'} onclick={() => (value = 'wavenumber')}>cm⁻¹</button>
</div>

<style>
  .rocker {
    display: flex;
    background: var(--alt);
    border-radius: 8px;
    padding: 3px;
  }
  .rocker button {
    flex: 1;
    border: none;
    background: transparent;
    font-family: 'Archivo', sans-serif;
    font-weight: 600;
    font-size: 15px;
    padding: 9px 6px;
    border-radius: 6px;
    color: var(--ink-muted);
    cursor: pointer;
  }
  .rocker button.on {
    background: var(--accent);
    color: #fff;
  }
</style>
