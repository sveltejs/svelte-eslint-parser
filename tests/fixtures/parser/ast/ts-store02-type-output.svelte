<script context="module" lang="ts">
	import { writable } from 'svelte/store'; // writable: <T_1>(value?: T_1 | undefined, start?: StartStopNotifier<T_1> | undefined) => Writable<T_1>, writable: <T_1>(value?: T_1 | undefined, start?: StartStopNotifier<T_1> | undefined) => Writable<T_1>
	const a = writable(0) // a: Writable<number>, writable(0): Writable<number>
	declare const $a: string // $a: string
</script>
<script lang="ts">
	const b = writable(0) // b: Writable<number>, writable(0): Writable<number>
	declare const $b: string // $b: string
</script>
{$a} <!-- $a: string -->
{$b} <!-- $b: string -->
