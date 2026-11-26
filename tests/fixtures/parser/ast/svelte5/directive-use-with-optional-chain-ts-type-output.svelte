<script lang="ts">
	function action(node: HTMLElement, param?: number) { // action: (node: HTMLElement, param?: number | undefined) => void, node: HTMLElement, param: number | undefined
		node.dataset.param = String(param); // node.dataset.param: string | undefined, String(param): string
	}
	const foo = { action }; // foo: { action: (node: HTMLElement, param?: number | undefined) => void; }, action: (node: HTMLElement, param?: number | undefined) => void, action: (node: HTMLElement, param?: number | undefined) => void
	const param = 0; // param: 0
</script>

<div use:foo?.action>a</div> <!-- foo?.action: (node: HTMLElement, param?: number | undefined) => void -->
<div use:foo?.action={param}>a</div> <!-- foo?.action: (node: HTMLElement, param?: number | undefined) => void, param: 0 -->
