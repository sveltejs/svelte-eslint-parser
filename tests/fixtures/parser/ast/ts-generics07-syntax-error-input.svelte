<script lang="ts" generics="T extends number, U ex T">
    export let array1: T[];
    export let array2: U[];
</script>

{#each array1 as a}
    {a}
{/each}
{#each array2 as a}
    {a}
{/each}
