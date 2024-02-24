<script context="module">
    type Foo = number | string // Foo: Foo
</script>

<script lang="ts" generics="
  T // Comments // T: Foo
    extends /* = */ Foo = number, // Foo: Foo
    // Comments
  U /* extends */ // U: U
    extends
    Record< // Record: Record<K, T>
      /* = */
      string, // =
      T // T: Foo
    >
     = Record<string, number> // Record: Record<K, T>
">
    export let array1: T[]; // array1: Foo[]
    export let array2: U[]; // array2: U[]
</script>

{#each array1 as a} <!-- array1: Foo[], a: Foo -->
    {a} <!-- a: Foo -->
{/each}
{#each array2 as a} <!-- array2: U[], a: U -->
    {a} <!-- a: U -->
{/each}
