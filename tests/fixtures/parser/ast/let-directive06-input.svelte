<script>
	import C from './C.svelte';
	export let message = 'hi';
	let comp = C;
</script>

<svelte:component this={comp} {message} let:message let:comp>
	{message}{comp}
</svelte:component>
{#if !message}
	<svelte:self {message} let:message>
		{message}
	</svelte:self>
{/if}
