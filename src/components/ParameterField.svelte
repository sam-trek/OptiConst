<script lang="ts">
  let {
    label,
    unit,
    value = $bindable(),
    step = 'any',
  }: { label: string; unit: string; value: number; step?: string } = $props();
</script>

<div class="ctrl">
  <label for={label}>{label}</label>
  <div class="val">
    <input id={label} type="number" {step} bind:value />
    <span class="unit">{unit}</span>
  </div>
</div>

<style>
  .ctrl label {
    display: block;
    font-size: 13.5px;
    color: var(--ink-muted);
    margin-bottom: 5px;
  }
  .val {
    background: var(--alt);
    border-radius: 6px;
    padding: 6px 10px;
    display: flex;
    justify-content: space-between;
    align-items: center;
  }
  input {
    border: none;
    background: transparent;
    font-family: 'JetBrains Mono', monospace;
    font-size: 16px;
    color: var(--ink);
    width: 100%;
    padding: 4px 0;
  }
  input:focus {
    outline: none;
  }
  .unit {
    color: var(--ink-muted);
    font-size: 12.5px;
    margin-left: 6px;
    white-space: nowrap;
  }
</style>
