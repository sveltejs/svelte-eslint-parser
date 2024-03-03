<script context="module">
    type Foo = number | string
</script>

<script lang="ts" generics="T extends Foo, U extends T">
    export let array1: T[];
    export let array2: U[];
</script>

{#each array1 as a}
    {a}
{/each}
{#each array2 as a}
    {a}
{/each}
