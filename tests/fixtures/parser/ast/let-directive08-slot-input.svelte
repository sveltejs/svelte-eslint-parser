<script>
	import C from './C.svelte';
	let a = 1;
	let b = 2;
	let c = 3;
	let d = 4;
	let e = 5;
	let f = 6;
	let g = 7;
	let h = 8;
	let i = 9;
	let j = 10;
	let k = 11;
</script>

<C let:a let:b let:c let:d let:f let:g let:h let:i let:j let:k>
	<p slot="named">{a}</p>
	<svelte:fragment slot="fragment">{b}</svelte:fragment>
	<div slot="nested"><span>{c}</span></div>
	<p slot="own" let:d>{d}</p>
	<C slot="component">{f}</C>
	<svelte:element this="p" slot="element">{h}</svelte:element>
	<slot slot="slot">{i}</slot>
	<svelte:component this={C} slot="svelte-component">{j}</svelte:component>
	<svelte:self slot="svelte-self">{k}</svelte:self>
	<p>{g}</p>
</C>
<C let:e>
	<p slot="default">{e}</p>
</C>
