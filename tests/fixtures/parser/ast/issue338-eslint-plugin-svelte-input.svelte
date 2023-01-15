<script lang="ts">
  export let foo: string | null = null;
  const p = Promise.resolve();
</script>

{#await p}
{:then v}
  {#if foo != null}
  {:else}
  {/if}
{/await}
