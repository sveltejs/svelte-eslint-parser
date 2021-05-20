<script>
	export let modelValue = {};
	function updateShowLocations(newValue) {
		modelValue = {
			...modelValue,
			showLocations: newValue
		};
	}
</script>

<label class="ast-options"
	><input
		type="checkbox"
		checked={modelValue.showLocations}
		on:change={(e) => updateShowLocations(e.target.checked)}
	/>Locations</label
>

<style>
	.ast-options {
		padding-left: 16px;
	}
</style>
