<script lang="ts">
	function action(node: HTMLElement, param?: number) {
		node.dataset.param = String(param);
	}
	function onClick(node: HTMLElement, handler: EventListener) {
		node.addEventListener('click', handler);
	}
	const foo = { action };
	const bar: { onClick: typeof onClick } | undefined = { onClick };
	const param = 0;
</script>

<div use:foo?.action>a</div>
<div use:foo?.action={param}>a</div>
<div use:bar?.onClick={(event) => event.type}>a</div>
