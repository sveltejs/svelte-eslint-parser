<script lang="ts" generics="T extends number, U ex T">
    export let array1: T[]; // array1: T[]
    export let array2: U[]; // array2: U[]
</script>

{#each array1 as a} <!-- array1: T[], a: T -->
    {a} <!-- a: T -->
{/each}
{#each array2 as a} <!-- array2: U[], a: U -->
    {a} <!-- a: U -->
{/each}
