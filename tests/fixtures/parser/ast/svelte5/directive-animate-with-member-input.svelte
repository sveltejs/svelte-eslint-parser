<script>
	import { flip } from 'svelte/animate';
	const foo = { flip };
	const list = $state([1, 2, 3]);
</script>

{#each list as item (item)}
	<li animate:foo.flip={{ duration: 200 }}>{item}</li>
{/each}
