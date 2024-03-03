<script context="module">
    type Foo = number | string
</script>

<script lang="ts" generics="T extends Foo">
    export let array: T[];
</script>

{#each array as a}
    {a}
{/each}
