<script lang="ts">
  const xs: unknown[] = [1];
</script>

{#each xs as a}
  {@const x: number = (a as number)}
  {@const y = (a) as number}
  {@const z: number = ((x))}
  {x}{y}{z}
{/each}
