<!-- Copied from https://github.com/sveltejs/svelte-eslint-parser/issues/502 -->
<script lang="ts">
    import Button from "$lib/Button.svelte";
</script>
<Button active={$store.number === index}>
    {index} {tab}
</Button>
