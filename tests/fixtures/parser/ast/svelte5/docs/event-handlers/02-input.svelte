<script>
	let count = $state(0);

	function onclick() {
		count++;
	}
</script>

<button {onclick}>
	clicks: {count}
</button>
