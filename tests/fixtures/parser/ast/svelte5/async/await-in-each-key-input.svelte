<script>
	let { items } = $props();
</script>

{#each items as item (await item.id)}
	<p>{item.name}</p>
{/each}
