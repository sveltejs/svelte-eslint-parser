<script>
	import C from './C.svelte';
	let message = 'hi';
	let value = 'v';
	let handler = () => {};
	let props = {};
</script>

<C {message} let:message>
	{message}
</C>
<C let:value bind:value>
	{value}
</C>
<C on:click={handler} let:handler>
	{handler}
</C>
<C {...props} let:props>
	{props}
</C>
