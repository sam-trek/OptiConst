<script lang="ts">
  import CalculatorView from './components/CalculatorView.svelte';
  import LifetimeView from './components/LifetimeView.svelte';
  import VerifyView from './components/VerifyView.svelte';
  import { runPaperExample, verifyAgainstPaper } from './lib/paper';

  type View = 'calc' | 'verify' | 'lifetime';
  let view = $state<View>('calc');

  // Headline score for the nav badge, at the default ±1% tolerance.
  const score = verifyAgainstPaper(runPaperExample(), 1);

  const tabs: { id: View; label: string; short?: string }[] = [
    { id: 'calc', label: 'Calculator' },
    { id: 'verify', label: 'Verify against paper', short: 'Verify' },
    { id: 'lifetime', label: 'Lifetime & quantum yield', short: 'Lifetime' },
  ];
</script>

<header class="topbar">
  <div class="brand">
    <span class="brand-mark">OptiConst</span>
    <span class="brand-sub">Absorption &amp; emission calculator</span>
  </div>
  <nav class="nav" aria-label="Pages">
    {#each tabs as t (t.id)}
      <button type="button" class:on={view === t.id} aria-current={view === t.id ? 'page' : undefined} onclick={() => (view = t.id)}>
        {#if t.short}
          <span class="lg">{t.label}</span><span class="sh">{t.short}</span>
        {:else}
          {t.label}
        {/if}
        {#if t.id === 'verify'}
          <span class="badge" class:warn={score.passed !== score.total}>{score.passed} / {score.total}</span>
        {/if}
      </button>
    {/each}
  </nav>
  <div class="privacy"><span class="dot"></span> Runs in your browser. Files are never uploaded.</div>
</header>

<!-- All pages stay mounted so nothing typed or uploaded is lost when switching. -->
<div hidden={view !== 'calc'}><CalculatorView /></div>
<div hidden={view !== 'verify'}><VerifyView onOpenCalculator={() => (view = 'calc')} /></div>
<div hidden={view !== 'lifetime'}><LifetimeView /></div>
