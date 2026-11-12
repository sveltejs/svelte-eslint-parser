<script lang="ts">
	interface Item {
		id: number;
		load(): Promise<string>;
	}
	interface Props {
		items: Item[];
		promise: Promise<Item>;
	}
	let { items, promise }: Props = $props();
</script>

{#each items as item (item.id)}
	{@const value = await item.load()}
	<p>{await promise} {value}</p>
{/each}

{#each items}
	<p>{await promise}</p>
{/each}

{#snippet row(load: () => Promise<string>)}
	<p>{await load()}</p>
{/snippet}

{#await promise then result}
	<p>{await result.load()}</p>
{:catch error}
	<p>{await promise} {error}</p>
{/await}

{@render row(() => items[0].load())}
