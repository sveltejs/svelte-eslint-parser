<script lang="ts">
	import type { Snippet } from 'svelte'; // Snippet: Snippet<T>, Snippet: Snippet<T>

	let { data, children, row }: { // data: any[], data: any[], children: (this: void) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }, children: (this: void) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }, row: (this: void, args_0: any) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }, row: (this: void, args_0: any) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }
		data: any[]; // data: any[]
		children: Snippet; // Snippet: Snippet<T>, children: (this: void) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }
		row: Snippet<[any]>; // Snippet: Snippet<T>, row: (this: void, args_0: any) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }
	} = $props(); // $props(): any
</script>

<table>
	{#if children} <!-- children: (this: void) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; } -->
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
