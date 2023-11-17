<script>
	let { onclick, children } = $props();
</script>

<button {onclick}>
	{@render children()}
</button>
