<script>
  let things = [{ id: 1 }];
</script>

{#each things as thing (key + s)}
  {const key = thing.id}
  {#snippet s()}{key}{/snippet}
  {@render s()}
{/each}
