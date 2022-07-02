<script>
	import SnsBar from './SnsBar.svelte';
	import { page } from '$app/stores';
	import { base as baseUrl } from '$app/paths';

	function isActive(pathname, path) {
		return pathname === path || pathname === `${baseUrl}${path}`;
	}

	// eslint-disable-next-line no-process-env -- ignore
	const dev = process.env.NODE_ENV !== 'production';
</script>

<header class="header">
	<span class="title">svelte-eslint-parser</span>
	<a
		class="menu"
		class:active={isActive($page.url.pathname, `/`)}
		sveltekit:prefetch
		href="{baseUrl}/">AST</a
	>
	<a
		class="menu"
		class:active={isActive($page.url.pathname, `/playground`)}
		sveltekit:prefetch
		href="{baseUrl}/playground">Playgroud</a
	>
	<a
		class="menu"
		class:active={isActive($page.url.pathname, `/scope`)}
		sveltekit:prefetch
		href="{baseUrl}/scope">Scope</a
	>
	{#if dev}
		<a
			class="menu"
			class:active={isActive($page.url.pathname, `/virtual-script-code`)}
			sveltekit:prefetch
			href="{baseUrl}/virtual-script-code">Virtual Script Code</a
		>
	{/if}
	<div class="debug">
		$page.url.pathname: {$page.url.pathname}
		baseUrl: {baseUrl}
	</div>
	<SnsBar />
	<a href="https://github.com/ota-meshi/svelte-eslint-parser" class="github-link">View on GitHub</a>
</header>

<style>
	.header {
		height: 32px;
		display: flex;
		border-bottom: 1px #ddd solid;
	}
	.title {
		font-size: 120%;
		display: flex;
		align-items: center;
		padding-right: 16px;
	}
	.menu {
		padding: 4px 16px;
		border-radius: 4px 4px 0 0;
		border-color: #ddd #ddd transparent #ddd;
		border-style: solid;
		border-width: 1px;
	}
	.menu.active {
		margin-bottom: -2px;
		border-bottom: 2px solid #ff3e00;
	}
	.github-link {
		display: flex;
		align-items: center;
	}
	.debug {
		display: none;
	}
</style>
