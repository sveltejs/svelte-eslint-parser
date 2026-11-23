<script lang="ts">
  const xs = [1];
  const ys = [2];
</script>

{#each (xs, ys) as y, i (y)}{y}{i}{/each}
