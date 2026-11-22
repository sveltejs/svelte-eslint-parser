<script lang="ts">
  const xs = [1];
  const p = Promise.resolve(1);
</script>

{xs // mustache
}
<div title={xs // attribute
}></div>
{#if xs // if
}{/if}
{#each xs // each
 as x, i (x // key
)}{x}{i}{/each}
{#await p // await
 then v}{v}{/await}
{#key xs // key block
}{/key}
{@html xs // html
}
