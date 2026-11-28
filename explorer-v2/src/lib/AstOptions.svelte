<script>
	let { options = $bindable({}) } = $props();
	function updateShowLocations(newValue) {
		options = {
			...options,
			showLocations: newValue
		};
	}
</script>

<label class="ast-options">
	<input
		type="checkbox"
		checked={options.showLocations}
		onchange={(e) => updateShowLocations(e.target.checked)}
	/>Locations
</label>

<style>
	.ast-options {
		padding-left: 16px;
	}
</style>
