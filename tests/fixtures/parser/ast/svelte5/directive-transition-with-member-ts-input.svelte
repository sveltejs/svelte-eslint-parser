<script lang="ts">
	import { fade } from 'svelte/transition';
	import { flip } from 'svelte/animate';
	const foo = { fade, flip };
	const list: number[] = $state([1, 2, 3]);
</script>

{#each list as item (item)}
	<li transition:foo.fade={{ duration: 200 }} animate:foo.flip>{item}</li>
{/each}
