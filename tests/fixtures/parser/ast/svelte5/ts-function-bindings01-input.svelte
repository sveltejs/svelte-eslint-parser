<script lang="ts">
	let value = $state('');
	let width = $state(0);
</script>

<input bind:value={() => value, (v) => (value = v.toLowerCase())} />
<div bind:clientWidth={null, (w) => (width = w)}>{width}</div>
