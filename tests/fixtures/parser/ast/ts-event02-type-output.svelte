<script lang="typescript">
    import Component from 'foo.svelte' // Component: LegacyComponentType
</script>
<button on:click="{e=>{}}"></button> <!-- e: any -->
<Component on:click="{e=>{}}"></Component> <!-- Component: LegacyComponentType, e: any -->
