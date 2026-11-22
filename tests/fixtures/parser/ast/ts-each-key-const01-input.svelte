<script lang="ts">
  type key = number;
  let things: { id: key }[] = [{ id: 1 }];
</script>

{#each things as thing (key)}
  {@const key = thing.id}
  {key}
{/each}
