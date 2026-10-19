<script lang="ts">
  let name = "world";
</script>

{#snippet text(value: string)}
  {value}
{/snippet}

{#snippet empty()}
  <p>empty</p>
{/snippet}

{@render text(name)}
{@render empty()}
