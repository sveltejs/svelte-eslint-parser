<script lang="ts">
	function action(node: HTMLElement, param?: number) {
		node.dataset.param = String(param);
	}
	const foo = { action };
	const param = 0;
</script>

<div use:foo?.action>a</div>
<div use:foo?.action={param}>a</div>
