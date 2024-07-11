<script lang="ts" generics="T"> // T: unknown
	import type { Snippet } from 'svelte'; // Snippet: Snippet<Parameters>, Snippet: Snippet<Parameters>

	type A = T // A: unknown, T: unknown
	let { data, children, row }:{ // data: unknown[], data: unknown[], children: Snippet<[]>, children: Snippet<[]>, row: Snippet<[unknown]>, row: Snippet<[unknown]>
		data: A[]; // A: unknown, data: unknown[]
		children: Snippet; // Snippet: Snippet<Parameters>, children: Snippet<[]>
		row: Snippet<[A]>; // Snippet: Snippet<Parameters>, A: unknown, row: Snippet<[unknown]>
	} = $props(); // $props(): any
</script>

<table>
	{#if children} <!-- children: Snippet<[]> -->
		<thead>
			<tr>{@render children()}</tr> <!-- children(): unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; } -->
		</thead>
	{/if}
	<tbody>
		{#each data as d} <!-- data: unknown[], d: unknown -->
			<tr>{@render row(d)}</tr> <!-- row(d): unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; } -->
		{/each}
	</tbody>
</table>
