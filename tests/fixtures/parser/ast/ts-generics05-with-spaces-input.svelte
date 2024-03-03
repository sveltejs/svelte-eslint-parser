<script context="module">
    type Foo = number | string
</script>

<script lang="ts" generics="
  T // Comments
    extends /* = */ Foo = number,
    // Comments
  U /* extends */
    extends
    Record<
      /* = */
      string, // =
      T
    >
     = Record<string, number>
">
    export let array1: T[];
    export let array2: U[];
</script>

{#each array1 as a}
    {a}
{/each}
{#each array2 as a}
    {a}
{/each}
