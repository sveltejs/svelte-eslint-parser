<script lang="ts">
	import { writable } from 'svelte/store';
    let x = "hello"
    const get = ()=>"hello"

    $: y = x
    $: z = y
    $: foo = get

	const a = writable(0)
	const b = writable(0)
</script>

<input title={z} bind:value={x}>
{foo()}
{a}
{$a}
{b}
{$b}
