<script lang="ts">
  let { label, value, formula }: { label: string; value: string; formula: string } = $props();
</script>

<div class="tile">
  <div class="ro-label">{label}</div>
  <div class="ro-val">{value}</div>
  <div class="ro-formula"><span class="fx">ƒ</span>{formula}</div>
</div>

<style>
  .ro-label {
    font-size: 13px;
    color: var(--ink-muted);
    margin-bottom: 5px;
  }
  .ro-val {
    font-family: 'Archivo', sans-serif;
    font-size: 25px;
    font-weight: 700;
    color: var(--ink);
  }
  .ro-formula {
    display: flex;
    align-items: center;
    gap: 5px;
    font-family: 'JetBrains Mono', monospace;
    font-size: 12.5px;
    color: var(--ink-muted);
    margin-top: 7px;
  }
  .fx {
    font-size: 11px;
    background: var(--accent-soft);
    color: var(--accent);
    border-radius: 3px;
    padding: 1px 4px;
    font-weight: 700;
    flex: none;
  }
</style>
