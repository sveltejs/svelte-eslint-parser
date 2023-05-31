<script lang="ts">
	import { writable } from 'svelte/store'; // writable: <T>(value: T, start?: StartStopNotifier<T> | undefined) => Writable<T>, writable: <T>(value: T, start?: StartStopNotifier<T> | undefined) => Writable<T>
    let x = "hello" // x: string
    const get = ()=>"hello" // get: () => string

    $: y = x // $: any, y: string, x: string
    $: z = y // $: any, z: string, y: string
    $: foo = get // $: any, foo: () => string, get: () => string

	const a = writable(0) // a: Writable<number>, writable(0): Writable<number>
	const b = writable(0) // b: Writable<number>, writable(0): Writable<number>
</script>

<input title={z} bind:value={x}> <!-- z: string, x: string -->
{foo()} <!-- foo(): string -->
{a} <!-- a: Writable<number> -->
{$a} <!-- $a: number -->
{b} <!-- b: Writable<number> -->
{$b} <!-- $b: number -->
