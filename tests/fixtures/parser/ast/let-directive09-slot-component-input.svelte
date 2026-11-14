<script>
	import C from './C.svelte';
	let a = 1;
	let b = 2;
	let c = 3;
</script>

<svelte:component this={C} let:a>
	<p slot="named">{a}</p>
</svelte:component>
{#if a}
	<svelte:self let:b>
		<p slot="named">{b}</p>
	</svelte:self>
{/if}
<C>
	<C slot="outer" let:c title={c}>
		<p slot="inner">{c}</p>
	</C>
</C>
