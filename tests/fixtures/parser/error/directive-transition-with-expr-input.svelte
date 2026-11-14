<script>
	import { fade } from 'svelte/transition';
	const foo = { fade }
	let visible = true;
</script>

<label>
	<input type="checkbox" bind:checked={visible}>
	visible
</label>

{#if visible}
	<p transition:foo.fade>
		Fades in and out
	</p>
{/if}

<!-- In Svelte 3 and 4, treat it as a compile error, as it will be a run-time error. Svelte 5 supports it. -->

<!-- https://svelte.dev/repl/0bd83f7f65714191bae9da8c23553451?version=3.52.0 -->
