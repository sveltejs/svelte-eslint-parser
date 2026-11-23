<script>
  let things = [{ id: 1 }];
</script>

{#each things as thing ((() => {
  const x = thing.id;
  return x;
})())}
  {@const x = thing.id}
  {x}
{/each}
