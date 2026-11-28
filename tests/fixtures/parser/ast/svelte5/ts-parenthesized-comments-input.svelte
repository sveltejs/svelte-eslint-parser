<script lang="ts">
  let xs = [1];
  let checked = false;
  const p = Promise.resolve(1);
  const fn = (v: number[]) => v;
  const Comp = fn;
</script>

{/* mustache */ (xs)}
{(/* inner */ (xs)) /* after */}
{/* a */ (/* b */ (xs) /* c */) /* d */}
{/* call */ (fn(xs) // inner
)}
<div title={/* attribute */ (xs)}></div>
<div {.../* spread */ (xs) /* spread end */}></div>
{#if /* if */ (xs)}{/if}
{#each /* each */ (xs) as x (/* key */ (x))}{x}{/each}
{#await /* await */ (p) then v}{v}{/await}
{@html /* html */ (xs)}
{(xs) /* block */ // line
}
{((xs) /* inner */) /* outer */}
{fn(xs) /* call */}
<input bind:value={xs} bind:checked /* in tag */ />
<Comp /* after name */ bind:value={xs} />
