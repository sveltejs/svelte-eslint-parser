<script>
  const xs = [1];
  const obj = { b: 1 };
</script>

{#each xs as a}
  {@const x = (a)}
  {@const y = ((a))}
  {@const z = (a) + (x)}
  {@const w = (a, y)}
  {@const { b } = (obj)}
  {@const v = ( /* c */ a /* d */ )}
  {x}{y}{z}{w}{b}{v}
{/each}
