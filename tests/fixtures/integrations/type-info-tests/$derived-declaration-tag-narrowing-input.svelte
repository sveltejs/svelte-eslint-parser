<script lang="ts">
  type Action = { name: "change"; id: string } | { name: "add" };
  type Entry = { kind: "file"; size: number } | { kind: "dir"; entries: Entry[] };

  let {
    action,
    entry,
    entries,
  }: { action: Action | undefined; entry: Entry; entries: Entry[] } = $props();
</script>

{#if action?.name === "change"}
  {const id = $derived(action.id)}
  <p>{id}</p>
{/if}

{#if entry.kind === "dir"}
  {const count = $derived(entry.entries.length)}
  <p>{count}</p>
{:else}
  {const size = $derived(entry.size)}
  {@const bytes = $derived(entry.size)}
  <p>{size} {bytes}</p>
{/if}

{#each entries as item (item)}
  {#if item.kind === "file"}
    {const size = $derived(item.size)}
    <p>{size}</p>
  {/if}
{/each}

{#snippet details(target: Entry)}
  {#if target.kind === "file"}
    {const size = $derived(target.size)}
    <p>{size}</p>
  {/if}
{/snippet}

{@render details(entry)}
