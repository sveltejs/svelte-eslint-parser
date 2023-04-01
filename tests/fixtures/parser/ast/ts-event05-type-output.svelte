<script lang="ts">
    import Component from './ts-event03-input.svelte'; // Component: typeof SvelteComponentDev
</script>

<Component on:foo="{e=>{ // Component: typeof SvelteComponentDev, e: CustomEvent<any>
    // TODO: e.detail is number
    e.detail; // e.detail: any
}}" />
