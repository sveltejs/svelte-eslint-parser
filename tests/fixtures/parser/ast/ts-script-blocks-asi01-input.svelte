<script lang="ts">
	export let name: string | undefined = undefined
</script>

<script lang="ts" context="module">
	`module`
</script>

{name ?? 'none'}
