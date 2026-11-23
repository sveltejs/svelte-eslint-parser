<script lang="ts" generics="const T extends readonly string[], const /* c */ U = T[number]"> // T: T, U: unknown, T: T
  let { items, value }: { items: T; value: U } = $props(); // items: T, items: T, value: unknown, value: unknown, items: T, T: T, value: unknown, U: unknown, $props(): { items: T; value: unknown; }
</script>

{#each items as item} <!-- items: T, item: string -->
  {item} {value} <!-- item: string, value: unknown -->
{/each}
