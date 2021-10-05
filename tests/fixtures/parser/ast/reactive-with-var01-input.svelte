<script>
	import { count, count2 } from './stores.js';
	import { writable } from 'svelte/store';
	
	let foo = 0
	let bar = writable(0)
	$: $count2 = $count * 2
	$: foo = $count * 3
	$: $bar = $count * 4
	$: baz = $count * 5 // ComputedVariable
</script>

<h1>$count: {$count}</h1>
<h1>$count2: {$count2}</h1>
<h1>foo: {foo}</h1>
<h1>$bar: {$bar}</h1>
<h1>baz: {baz}</h1>
<button on:click={()=>$count++}>+1</button>
