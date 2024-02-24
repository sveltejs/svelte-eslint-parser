<script context="module">
    type Foo = number | string // Foo: Foo
</script>

<script lang="ts" generics="T extends Foo"> // T: Foo, Foo: Foo
    export let array: T[]; // array: Foo[]
</script>

{#each array as a} <!-- array: Foo[], a: Foo -->
    {a} <!-- a: Foo -->
{/each}
