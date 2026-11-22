<script lang="ts" generics="const T extends readonly string[], const /* c */ U = T[number]">
  let { items, value }: { items: T; value: U } = $props();
</script>

{#each items as item}
  {item} {value}
{/each}
