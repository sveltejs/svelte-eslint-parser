<script>
	import Outer from './Outer.svelte';
	import Inner from './Inner.svelte';
	let x = 1;
	let y = 2;
	let comp = Inner;
</script>

<Outer>
	<Inner slot="a" let:x foo={x}>{x}</Inner>
	<svelte:component this={comp} slot="b" let:y foo={y}>{y}</svelte:component>
</Outer>
