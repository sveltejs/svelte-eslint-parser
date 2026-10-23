<script lang="ts">
  import Comp from "./Comp.svelte";

  // A user type must not change how snippet calls are typed.
  type ReturnType<T> = T extends unknown ? void : never;

  let name = "world";
  let items = [1, 2];
</script>

{#snippet text(value: string)}
  {value}
{/snippet}

{#snippet empty()}
  <p>empty</p>
{/snippet}

{#snippet outer(count: number)}
  {#snippet inner(label: string)}{label}{count}{/snippet}
  {#each items as item}{@render inner(String(item))}{/each}
{/snippet}

<Comp>
  {#snippet row(value: number)}<b>{value}</b>{/snippet}
  {@render row(1)}
</Comp>

{@render text(name)}
{@render empty()}
{@render outer(1)}
