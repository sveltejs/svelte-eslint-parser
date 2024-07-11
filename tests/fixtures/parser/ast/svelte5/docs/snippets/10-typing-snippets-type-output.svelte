<script lang="ts">
	import type { Snippet } from 'svelte'; // Snippet: Snippet<Parameters>, Snippet: Snippet<Parameters>

	let { data, children, row }: { // data: any[], data: any[], children: Snippet<[]>, children: Snippet<[]>, row: Snippet<[any]>, row: Snippet<[any]>
		data: any[]; // data: any[]
		children: Snippet; // Snippet: Snippet<Parameters>, children: Snippet<[]>
		row: Snippet<[any]>; // Snippet: Snippet<Parameters>, row: Snippet<[any]>
	} = $props(); // $props(): any
</script>

<table>
	{#if children} <!-- children: Snippet<[]> -->
		<thead>
			<tr>{@render children()}</tr> <!-- children(): unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; } -->
		</thead>
	{/if}
	<tbody>
		{#each data as d} <!-- data: any[], d: any -->
			<tr>{@render row(d)}</tr> <!-- row(d): unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; } -->
		{/each}
	</tbody>
</table>
