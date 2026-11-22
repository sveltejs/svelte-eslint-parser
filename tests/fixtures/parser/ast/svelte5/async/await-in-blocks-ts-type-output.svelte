<script lang="ts">
	interface Item { // Item: Item
		id: number; // id: number
		load(): Promise<string>; // load: () => Promise<string>, Promise: Promise<T>
	}
	interface Props { // Props: Props
		items: Item[]; // items: Item[], Item: Item
		promise: Promise<Item>; // promise: Promise<Item>, Promise: Promise<T>, Item: Item
	}
	let { items, promise }: Props = $props(); // items: Item[], items: Item[], promise: Promise<Item>, promise: Promise<Item>, Props: Props, $props(): Props
</script>

{#each items as item (item.id)} <!-- items: Item[], item: Item, item.id: number -->
	{@const value = await item.load()} <!-- value: string, item.load(): Promise<string> -->
	<p>{await promise} {value}</p> <!-- promise: Promise<Item>, value: string -->
{/each}

{#each items} <!-- items: Item[] -->
	<p>{await promise}</p> <!-- promise: Promise<Item> -->
{/each}

{#snippet row(load: () => Promise<string>)} <!-- row: (load: () => Promise<string>) => { '{@render ...} must be called with a Snippet': "import type { Snippet } from 'svelte'"; } & unique symbol, load: () => Promise<string> -->
	<p>{await load()}</p> <!-- load(): Promise<string> -->
{/snippet}

{#await promise then result} <!-- promise: Promise<Item>, result: Item -->
	<p>{await result.load()}</p> <!-- result.load(): Promise<string> -->
{:catch error} <!-- error: Error -->
	<p>{await promise} {error}</p> <!-- promise: Promise<Item>, error: Error -->
{/await}

{@render row(() => items[0].load())} <!-- row(() => items[0].load()): { '{@render ...} must be called with a Snippet': "import type { Snippet } from 'svelte'"; } & unique symbol -->
