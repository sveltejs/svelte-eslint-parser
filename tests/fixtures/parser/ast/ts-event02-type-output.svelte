<script lang="typescript">
    import Component from 'foo.svelte' // Component: any
</script>
<button on:click="{e=>{}}"></button> <!-- e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; } -->
<Component on:click="{e=>{}}"></Component> <!-- Component: any, e: any -->
