<script lang="ts">
	function action(node: HTMLElement, param?: number) { // action: (node: HTMLElement, param?: number | undefined) => void, node: HTMLElement, param: number | undefined
		node.dataset.param = String(param); // node.dataset.param: string | undefined, String(param): string
	}
	function onClick(node: HTMLElement, handler: EventListener) { // onClick: (node: HTMLElement, handler: EventListener) => void, node: HTMLElement, handler: EventListener
		node.addEventListener('click', handler); // node.addEventListener('click', handler): void
	}
	const foo = { action }; // foo: { action: (node: HTMLElement, param?: number | undefined) => void; }, action: (node: HTMLElement, param?: number | undefined) => void, action: (node: HTMLElement, param?: number | undefined) => void
	const bar: { onClick: typeof onClick } | undefined = { onClick }; // bar: { onClick: (node: HTMLElement, handler: EventListener) => void; } | undefined, onClick: (node: HTMLElement, handler: EventListener) => void, onClick: (node: HTMLElement, handler: EventListener) => void
	const param = 0; // param: 0
</script>

<div use:foo?.action>a</div> <!-- foo?.action: (node: HTMLElement, param?: number | undefined) => void -->
<div use:foo?.action={param}>a</div> <!-- foo?.action: (node: HTMLElement, param?: number | undefined) => void, param: 0 -->
<div use:bar?.onClick={(event) => event.type}>a</div> <!-- bar?.onClick: ((node: HTMLElement, handler: EventListener) => void) | undefined, event: Event, event.type: string -->
