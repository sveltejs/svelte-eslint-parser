<script lang="ts">
	import { writable } from 'svelte/store'; // writable: <T>(value?: T | undefined, start?: StartStopNotifier<T> | undefined) => Writable<T>, writable: <T>(value?: T | undefined, start?: StartStopNotifier<T> | undefined) => Writable<T>

    const a = writable(0) // a: Writable<number>, writable(0): Writable<number>
    $: aValue = $a // $: any, aValue: number, $a: number
    $: bValue = $b // $: any, bValue: string, $b: string
    const b = writable("b") // b: Writable<string>, writable("b"): Writable<string>
</script>

{a} <!-- a: Writable<number> -->
{$a} <!-- $a: number -->
{aValue} <!-- aValue: number -->
{b} <!-- b: Writable<string> -->
{$b} <!-- $b: string -->
{bValue} <!-- bValue: string -->
