<script>
	const foo = {
		action() {},
	};
</script>

<div use:foo?.action>a</div>
<div use:foo?.action={42}>a</div>
