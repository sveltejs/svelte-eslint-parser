<script>
  const xs = [1];
</script>

{#each xs as a}
  {@const t = (a) // trailing
  }
  {@const u = a // trailing
}
  {t}{u}
{/each}
