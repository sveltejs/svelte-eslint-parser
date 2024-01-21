<script lang="typescript">
    import Component from 'foo.svelte' // Component: typeof SvelteComponent
</script>
<button onclick="{e=>{}}"></button> <!-- e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; } -->
<Component onclick="{e=>{}}"></Component> <!-- Component: typeof SvelteComponent, e: any -->
