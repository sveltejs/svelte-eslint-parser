<script lang="ts">
	let value = $state(''); // value: string, $state(''): ""
	let width = $state(0); // width: number, $state(0): 0
</script>

<input bind:value={() => value, (v) => (value = v.toLowerCase())} /> <!-- value: string, v: string, value: string, v.toLowerCase(): string -->
<div bind:clientWidth={null, (w) => (width = w)}>{width}</div> <!-- w: any, width: number, w: any, width: number -->
