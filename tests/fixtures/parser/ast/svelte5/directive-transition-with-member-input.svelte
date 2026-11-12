<script>
	import { fade, fly } from 'svelte/transition';
	const foo = { fade, fly, nested: { fade } };
	let visible = $state(true);
</script>

<label>
	<input type="checkbox" bind:checked={visible}>
	visible
</label>

{#if visible}
	<p transition:foo.fade>Fades in and out</p>
	<p transition:foo.nested.fade|local>Fades in and out</p>
	<p in:foo.fly|global={{ y: 200, duration: 2000 }} out:foo.fade>
		Flies in, fades out
	</p>
{/if}
