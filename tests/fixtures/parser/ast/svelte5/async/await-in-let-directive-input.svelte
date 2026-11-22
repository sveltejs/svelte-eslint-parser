<script>
	import Component from './Component.svelte';
	let { promise } = $props();
</script>

<div let:item>{await promise} {item}</div>

<Component let:item>{await promise} {item}</Component>
