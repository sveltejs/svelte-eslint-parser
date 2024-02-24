<script lang="ts">
	import type { Snippet } from 'svelte'; // Snippet: Snippet<T>, Snippet: Snippet<T>

	let { data, children, row } = $props<{ // data: any[], data: any[], children: (this: void) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }, children: (this: void) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }, row: (this: void, args_0: any) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }, row: (this: void, args_0: any) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }, $props<{ data: any[]; children: Snippet; row: Snippet<[any]>; }>(): { data: any[]; children: (this: void) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }; row: (this: void, args_0: any) => unique symbol & { ...; }; }
		data: any[];
		children: Snippet;
		row: Snippet<[any]>;
	}>();
</script>

<table>
	{#if children} <!-- children: (this: void) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; } -->
		<thead>
			<tr>{@render children()}</tr> <!-- children: (this: void) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; } -->
		</thead>
	{/if}
	<tbody>
		{#each data as d} <!-- data: any[], d: any -->
			<tr>{@render row(d)}</tr> <!-- row: (this: void, args_0: any) => unique symbol & { _: "functions passed to {@render ...} tags must use the `Snippet` type imported from \"svelte\""; }, d: any -->
		{/each}
	</tbody>
</table>