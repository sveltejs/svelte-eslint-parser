<script lang="ts">
	import { writable } from 'svelte/store';

    const a = writable(0)
    $: aValue = $a
    $: bValue = $b
    const b = writable("b")
</script>

{a}
{$a}
{aValue}
{b}
{$b}
{bValue}
