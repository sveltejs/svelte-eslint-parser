<script lang="ts">
	let {
		1: one = $bindable(),
		[`a`]: a = $bindable(),
		['b']: b = $bindable(),
	}: { 1: number; a: string; b: string } = $props()!;
</script>

{one} {a} {b}
