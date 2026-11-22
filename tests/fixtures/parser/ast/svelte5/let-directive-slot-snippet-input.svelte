<script>
	import C from './C.svelte';
	let x = 1;
</script>

<C let:x title={s}>
	<p>{@render s()}</p>
	{#snippet s()}{x}{/snippet}
	<p slot="a">{@render s()}</p>
</C>
{@render s()}
