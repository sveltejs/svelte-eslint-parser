<script>
	import Header from '$lib/Header.svelte';
	import '../app.css';
</script>

<Header />

<main class="main">
	<slot />
</main>

<style>
	.main {
		position: relative;
		height: calc(100vh - 64px);
	}
	.main > * {
		position: relative;
		width: 100%;
		height: 100%;
	}
</style>
