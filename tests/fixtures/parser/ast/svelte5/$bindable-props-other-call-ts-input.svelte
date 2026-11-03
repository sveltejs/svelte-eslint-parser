<script lang="ts">
	let {
		value = $bindable(),
		other = $props("value"),
	}: { value: number; other: unknown } = $props();
</script>

<input bind:value />
{other}
