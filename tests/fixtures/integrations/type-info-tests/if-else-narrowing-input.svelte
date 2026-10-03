<script lang="ts">
  type Entry =
    | { kind: 'analysis'; modIds: string[] }
    | { kind: 'backup'; dir: string }
    | { kind: 'audit'; modIds: string[] };

  let { item }: { item: Entry } = $props();
</script>

{#if item.kind === 'analysis'}
  {item.modIds.length}
{:else if item.kind === 'backup'}
  {item.dir}
{:else}
  {item.modIds.length}
{/if}

{#if item.kind === 'backup'}
  {item.dir}
{:else}
  {item.modIds.length}
{/if}

{#if item.kind === 'backup'}
  {item.dir}
{:else if item.modIds.length > 0}
  {item.modIds.length}
{:else}
  {item.modIds.length}
{/if}

{#if item.kind === 'backup'}
  {item.dir}
{:else}
  {#if item.kind === 'analysis'}
    {item.modIds.length}
  {:else}
    {item.modIds.length}
  {/if}
{/if}
