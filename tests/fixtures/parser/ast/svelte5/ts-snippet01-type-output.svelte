<script lang="ts">
    let msg = "" // msg: string
</script>

{#snippet foo(msg: string)} <!-- foo: (msg: string) => ReturnType<import("svelte").Snippet>, msg: string -->
	<p>{msg}</p> <!-- msg: string -->
{/snippet}

{@render foo(msg)} <!-- foo(msg): { '{@render ...} must be called with a Snippet': "import type { Snippet } from 'svelte'"; } & unique symbol -->
