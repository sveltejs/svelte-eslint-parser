<script lang="ts">
	import type { HTMLButtonAttributes } from 'svelte/elements';

	let { children, ...props }: HTMLButtonAttributes = $props();
</script>

<!-- `props` includes attachments -->
<button {...props}>
	{@render children?.()}
</button>