<script>
  let things = [{ id: 1 }];
  let key = 1;
</script>

{#each things as { id }, i (id + i + key + (() => other)())}
  {@const key = id}
  {@const other = i}
  {key}{other}
{:else}
  {@const other = 0}
  {other}
{/each}
