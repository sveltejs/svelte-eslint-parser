<!-- Copied from https://github.com/sveltejs/svelte-eslint-parser/issues/408-->
<script lang="ts">
export let collapsed = false;
</script>

<div>
    {#if !collapsed}
        <svelte:self collapsed let:something>
            <slot {something} />
        </svelte:self>
    {/if}
</div>
