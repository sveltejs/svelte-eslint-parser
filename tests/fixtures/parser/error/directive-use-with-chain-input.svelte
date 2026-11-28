<script>
	const foo = {
		action() {},
	};
</script>

<div use:foo?.action>a</div>

<!-- Svelte 3 and 4 do not resolve a chained name, so it stays an error there. Svelte 5 accepts it. -->
