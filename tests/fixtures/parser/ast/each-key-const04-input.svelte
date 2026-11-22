<script>
  let groups = [[{ id: 1 }]];
</script>

{#each groups as group}
  {@const key = group.length}
  {#each group as item (key)}
    {@const key = item.id}
    {key}
  {/each}
{/each}
