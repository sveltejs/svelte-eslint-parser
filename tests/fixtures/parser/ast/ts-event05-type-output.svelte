<script lang="ts">
    import Component from './ts-event03-input.svelte'; // Component: typeof SvelteComponent
</script>

<Component on:foo="{e=>{ // Component: typeof SvelteComponent, e: CustomEvent<any>
    // e.detail is number
    //   `@typescript-eslint/parser` doesn't get the correct types.
    //   Using `typescript-eslint-parser-for-extra-files` will give we the correct types.
    //   See `ts-event06-input.svelte` test case
    e.detail; // e.detail: any
}}" />
