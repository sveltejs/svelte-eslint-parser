<script lang="ts" generics="T"> // T: unknown
	import type { Snippet } from 'svelte'; // Snippet: Snippet<T>, Snippet: Snippet<T>

	type A = T // A: unknown, T: unknown
	let { data, children, row } = $props<{ // data: unknown[], data: unknown[], children: (this: void) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }, children: (this: void) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }, row: (this: void, args_0: unknown) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }, row: (this: void, args_0: unknown) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }, $props<{ data: A[]; children: Snippet; row: Snippet<[A]>; }>(): { data: unknown[]; children: (this: void) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }; row: (this: void, args_0: unknown) => unique symbol & { ...; }; }
		data: A[];
		children: Snippet;
		row: Snippet<[A]>;
	}>();
</script>

<table>
	{#if children} <!-- children: (this: void) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; } -->
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
