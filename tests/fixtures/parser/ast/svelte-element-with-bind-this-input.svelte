<script>
	const tag = 'div';
	let a;
	$: console.log(a)
</script>

<svelte:element this={tag} bind:this={a}>Foo</svelte:element>
