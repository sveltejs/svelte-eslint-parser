<script>
	const foo = {
		fade: () => ({}),
	};
</script>

<div transition:foo?.fade>a</div>

<!-- Svelte 3 and 4 do not resolve a chained name, so it stays an error there. Svelte 5 accepts it. -->
