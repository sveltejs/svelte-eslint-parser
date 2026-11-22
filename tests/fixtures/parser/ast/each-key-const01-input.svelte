<script>
  let things = [{ id: 1 }];
</script>

{#each things as thing (key)}
  {@const key = thing.id}
  {key}
{/each}
