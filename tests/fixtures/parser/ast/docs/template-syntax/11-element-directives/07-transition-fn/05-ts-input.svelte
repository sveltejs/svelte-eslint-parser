<script lang="ts">
	export let visible:boolean = false;

	function typewriter(node:HTMLElement, { speed = 50 }) {
		const valid = (
			node.childNodes.length === 1 &&
			node.childNodes[0].nodeType === Node.TEXT_NODE
		);

		if (!valid) return {};

		const text = node.textContent!;
		const duration = text.length * speed;

		return {
			duration,
			tick: (t:number, _u:number) => {
				const i = ~~(text.length * t);
				node.textContent = text.slice(0, i);
			}
		};
	}
</script>

{#if visible}
	<p in:typewriter="{{ speed: 20 }}">
		The quick brown fox jumps over the lazy dog
	</p>
{/if}
