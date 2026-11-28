<script lang="ts">
	const { names }: Props = $props() // names: string[], names: string[], Props: Props, $props(): Props
	let count = $state(0) // count: number, $state(0): 0
</script>

<script lang="ts" module>
	[1, 2].forEach((n) => console.log(n)) // [1, 2].forEach((n) => console.log(n)): void
	export type Props = { names: string[] } // Props: Props, names: string[]
</script>

<button onclick={() => count++}>{names.join(', ')} {count}</button> <!-- count: number, names.join(', '): string, count: number -->
