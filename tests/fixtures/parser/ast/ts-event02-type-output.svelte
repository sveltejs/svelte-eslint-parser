<script lang="typescript">
    import Component from 'foo.svelte' // Component: typeof SvelteComponentDev
</script>
<button on:click="{e=>{}}"></button> <!-- e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; } -->
<Component on:click="{e=>{}}"></Component> <!-- Component: typeof SvelteComponentDev, e: CustomEvent<any> -->
