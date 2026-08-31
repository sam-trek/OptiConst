<script lang="ts">
  let { message }: { message: string } = $props();
</script>

<div class="caution">
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">
    <path d="M12 9v4" /><path d="M12 17h.01" />
    <path d="M10.3 3.9 2.5 17.5a1.7 1.7 0 0 0 1.5 2.5h16a1.7 1.7 0 0 0 1.5-2.5L13.7 3.9a1.7 1.7 0 0 0-3.4 0Z" />
  </svg>
  <div class="caution-text">{message}</div>
</div>

<style>
  .caution {
    display: flex;
    gap: 10px;
    align-items: center;
    background: var(--warn-bg);
    border-radius: 9px;
    padding: 9px 14px;
  }
  .caution svg {
    width: 15px;
    height: 15px;
    color: var(--warn-accent);
    flex: none;
  }
  .caution-text {
    font-size: 14px;
    color: var(--warn-ink);
  }
</style>
