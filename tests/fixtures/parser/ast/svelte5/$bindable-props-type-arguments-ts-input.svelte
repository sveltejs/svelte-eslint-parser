<script lang="ts">
	let { value = $bindable(), label = 'label' } = $props<{ value: number; label: string }>()!;
</script>

<input bind:value />
{label}
