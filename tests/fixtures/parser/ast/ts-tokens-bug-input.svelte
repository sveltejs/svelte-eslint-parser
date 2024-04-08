<script lang="ts">
    // Copied from https://github.com/sveltejs/svelte-eslint-parser/issues/502
    import Button from "$lib/Button.svelte";
</script>
<Button active={$store.number === index}>
    {index} {tab}
</Button>
