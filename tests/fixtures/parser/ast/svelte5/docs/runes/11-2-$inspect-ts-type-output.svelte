<script lang="ts">
	let count = $state(0); // count: number, $state(0): 0
	let message = $state('hello'); // message: string, $state('hello'): "hello"

	$inspect({ count, message }); // $inspect({ count, message }): void
</script>

<button onclick={() => count++}>Increment</button> <!-- count: number -->
<input bind:value={message} /> <!-- message: string -->
