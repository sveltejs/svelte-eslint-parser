<script lang="ts">
	import { writable } from 'svelte/store';
	const a = writable(0)
	const b = writable(0)
	const $b = 'abc'
	type $c = 'abc'
	const c: $c = 'abc'
</script>
{$a}
{b}
{$b}
{c}
{$c}
{$unknown}
