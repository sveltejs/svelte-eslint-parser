<script>
	import C from './C.svelte';
	let message = 'hi';
	let row = 1;
</script>

<C {message} render={row} let:message>
	{#snippet row()}
		hi
	{/snippet}
	{message}
</C>
<svelte:component this={C} render={() => cell} let:value>
	{#snippet cell()}
		hi
	{/snippet}
	{value}
</svelte:component>
