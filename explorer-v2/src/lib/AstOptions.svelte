<script>
	export let options = {};
	function updateShowLocations(newValue) {
		options = {
			...options,
			showLocations: newValue
		};
	}
</script>

<label class="ast-options"
	><input
		type="checkbox"
		checked={options.showLocations}
		on:change={(e) => updateShowLocations(e.target.checked)}
	/>Locations</label
>

<style>
	.ast-options {
		padding-left: 16px;
	}
</style>
