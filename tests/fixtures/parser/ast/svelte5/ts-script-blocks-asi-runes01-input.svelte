<script lang="ts">
	const { names }: Props = $props()
	let count = $state(0)
</script>

<script lang="ts" module>
	[1, 2].forEach((n) => console.log(n))
	export type Props = { names: string[] }
</script>

<button onclick={() => count++}>{names.join(', ')} {count}</button>
