<script>
	import SnsBar from './SnsBar.svelte';
	import { page } from '$app/stores';
	import { base as baseUrl } from '$app/paths';
</script>

<header class="header">
	<span class="title">svelte-eslint-parser</span>
	<a
		class="menu"
		class:active={$page.url.pathname === `${baseUrl}/`}
		sveltekit:prefetch
		href="{baseUrl}/">AST</a
	>
	<a
		class="menu"
		class:active={$page.url.pathname === `${baseUrl}/playground`}
		sveltekit:prefetch
		href="{baseUrl}/playground">Playgroud</a
	>
	<a
		class="menu"
		class:active={$page.url.pathname === `${baseUrl}/scope`}
		sveltekit:prefetch
		href="{baseUrl}/scope">Scope</a
	>
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
</style>
