<script lang="typescript">
    import Component from 'foo.svelte' // Component: ComponentType
</script>
<button onclick="{e=>{}}"></button> <!-- e: MouseEvent & { currentTarget: EventTarget & HTMLButtonElement; } -->
<Component onclick="{e=>{}}"></Component> <!-- Component: ComponentType, e: any -->
