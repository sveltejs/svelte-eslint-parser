<script lang="typescript">
    import Component from 'foo.svelte' // Component: LegacyComponentType
</script>
<button onclick="{e=>{}}"></button> <!-- e: any -->
<Component onclick="{e=>{}}"></Component> <!-- Component: LegacyComponentType, e: any -->
