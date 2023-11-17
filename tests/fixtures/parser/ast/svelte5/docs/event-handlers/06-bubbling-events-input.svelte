<script>
	let { children, ...props } = $props();
</script>

<button {...props}>
	{@render children()}
</button>
