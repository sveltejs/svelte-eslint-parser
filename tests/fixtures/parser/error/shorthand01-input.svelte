<script>
import Component from './Component.svelte'
let name = 'world';
const max = 0
const width = 0
</script>

<Component bind:max-width>Hello {name}!</Component>