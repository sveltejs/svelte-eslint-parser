<script context="module">
    type Foo = number | string // Foo: Foo
</script>

<script lang="ts" generics="
  T // T: Foo
    extends Foo, // Foo: Foo
    // Comments
  U extends // U: Foo
    T // T: Foo
    ">
    export let array1: T[]; // array1: Foo[]
    export let array2: U[]; // array2: Foo[]
</script>

{#each array1 as a} <!-- array1: Foo[], a: Foo -->
    {a} <!-- a: Foo -->
{/each}
{#each array2 as a} <!-- array2: Foo[], a: Foo -->
    {a} <!-- a: Foo -->
{/each}
