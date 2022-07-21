<script>
	import { writable } from 'svelte/store';
	
	const foo = writable(0)
	const bar = writable(0)
	$: $foo = $bar * 2
</script>

<h1>$foo: {$foo}</h1>
<h1>$bar: {$bar}</h1>
<button on:click={()=>$foo++}>$foo++</button>
<button on:click={()=>$bar++}>$bar++</button>
