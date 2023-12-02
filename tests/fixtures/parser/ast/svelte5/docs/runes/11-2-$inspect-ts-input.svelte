<script lang="ts">
	let count = $state(0);
	let message = $state('hello');

	$inspect({ count, message });
</script>

<button onclick={() => count++}>Increment</button>
<input bind:value={message} />
