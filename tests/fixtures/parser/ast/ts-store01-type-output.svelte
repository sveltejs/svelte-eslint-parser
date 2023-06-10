<script lang="ts">
	import { writable } from 'svelte/store'; // writable: <T_1>(value?: T_1 | undefined, start?: StartStopNotifier<T_1> | undefined) => Writable<T_1>, writable: <T_1>(value?: T_1 | undefined, start?: StartStopNotifier<T_1> | undefined) => Writable<T_1>
	const a = writable(0) // a: Writable<number>, writable(0): Writable<number>
	const b = writable(0) // b: Writable<number>, writable(0): Writable<number>
	const $b = 'abc' // $b: "abc"
	type $c = 'abc' // $c: "abc"
	const c: $c = 'abc' // c: "abc"
</script>
{$a} <!-- $a: number -->
{b} <!-- b: Writable<number> -->
{$b} <!-- $b: "abc" -->
{c} <!-- c: "abc" -->
{$c} <!-- $c: any -->
{$d} <!-- $d: any -->
