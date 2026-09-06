<script lang="ts">
  import type { Snippet } from 'svelte';

  let {
    stepNumber,
    title,
    expanded = $bindable(true),
    children,
  }: {
    stepNumber: number;
    title: string;
    expanded?: boolean;
    children: Snippet;
  } = $props();
</script>

<div class="step-card">
  <button type="button" class="step-head" onclick={() => (expanded = !expanded)} aria-expanded={expanded}>
    <span class="step-num">{stepNumber}</span>
    <span class="step-title">{title}</span>
    <span class="chevron" class:collapsed={!expanded}>
      <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M6 9l6 6 6-6" /></svg>
    </span>
  </button>
  <div class="collapse" class:open={expanded}>
    <div class="collapse-inner">
      {@render children()}
    </div>
  </div>
</div>

<style>
  .step-card {
    border: 1px solid var(--line);
    border-radius: 12px;
    padding: 4px 16px 14px;
  }
  .step-head {
    width: 100%;
    display: flex;
    align-items: center;
    gap: 8px;
    font: inherit;
    font-weight: 700;
    font-size: 14.5px;
    color: var(--ink);
    background: none;
    border: none;
    padding: 10px 0;
    cursor: pointer;
    text-align: left;
  }
  .step-num {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 20px;
    height: 20px;
    border-radius: 50%;
    background: var(--ink);
    color: #fff;
    font-size: 11.5px;
    font-weight: 700;
    flex: none;
  }
  .step-title {
    flex: 1;
  }
  .chevron {
    display: flex;
    color: var(--ink-muted);
    transition: transform 200ms ease;
  }
  .chevron.collapsed {
    transform: rotate(-90deg);
  }
  .chevron svg {
    width: 16px;
    height: 16px;
  }
  .collapse {
    display: grid;
    grid-template-rows: 0fr;
    transition: grid-template-rows 220ms ease;
  }
  .collapse.open {
    grid-template-rows: 1fr;
  }
  .collapse-inner {
    overflow: hidden;
    min-height: 0;
    display: flex;
    flex-direction: column;
    gap: 10px;
  }
</style>
