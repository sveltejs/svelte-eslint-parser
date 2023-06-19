<script lang="typescript">
    import Component from 'foo.svelte' // Component: typeof SvelteComponent
</script>
<button on:click="{e=>{}}"></button> <!-- e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; } -->
<Component on:click="{e=>{}}"></Component> <!-- Component: typeof SvelteComponent, e: CustomEvent<any> -->
