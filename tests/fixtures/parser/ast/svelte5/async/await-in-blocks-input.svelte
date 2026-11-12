<script>
	let { items, promise } = $props();
</script>

{#each items as item (item.id)}
	{@const value = await item.load()}
	<p>{await promise} {value}</p>
{/each}

{#each items}
	<p>{await promise}</p>
{/each}

{#snippet row(load)}
	<p>{await load()}</p>
{/snippet}

{#await promise then result}
	<p>{await result.load()}</p>
{:catch error}
	<p>{await promise} {error}</p>
{/await}

{@render row(() => items[0].load())}
