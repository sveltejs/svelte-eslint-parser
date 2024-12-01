<script>
	// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair -- ignore
	/* eslint-disable no-useless-escape -- ignore */
	import MonacoEditor from './MonacoEditor.svelte';
	import * as svelteEslintParser from 'svelte-eslint-parser';
	import { deserializeState, serializeState } from './scripts/state';
	import { onDestroy, onMount } from 'svelte';

	let tsParser = undefined;
	let loaded = false;
	import('@typescript-eslint/parser')
		.then((parser) => {
			if (typeof window !== 'undefined') {
				if (!window.process) {
					window.process = {
						cwd: () => '',
						env: {}
					};
				}
			}
			tsParser = parser;
		})
		.then(() => {
			loaded = true;
		});

	const DEFAULT_CODE = `<script lang="ts">
    const array = [1, 2, 3]

    function inputHandler () {
        // process
    }
<\/script>

<input on:input={inputHandler}>

{#each array as e}
    {@const ee = e * 2}
    {ee}
{/each}
`;
	const state = deserializeState(
		(typeof window !== 'undefined' && window.location.hash.slice(1)) || ''
	);
	let code = state.code || DEFAULT_CODE;
	let virtualScriptCode = '';
	let time = '';

	let vscriptEditor, sourceEditor;
	$: {
		if (loaded) {
			refresh(code);
		}
	}

	$: serializedString = (() => {
		const serializeCode = DEFAULT_CODE === code ? undefined : code;
		return serializeState({
			code: serializeCode
		});
	})();
	$: {
		if (typeof window !== 'undefined') {
			window.location.replace(`#${serializedString}`);
		}
	}
	onMount(() => {
		if (typeof window !== 'undefined') {
			window.addEventListener('hashchange', onUrlHashChange);
		}
	});
	onDestroy(() => {
		if (typeof window !== 'undefined') {
			window.removeEventListener('hashchange', onUrlHashChange);
		}
	});
	function onUrlHashChange() {
		const newSerializedString =
			(typeof window !== 'undefined' && window.location.hash.slice(1)) || '';
		if (newSerializedString !== serializedString) {
			const state = deserializeState(newSerializedString);
			code = state.code || DEFAULT_CODE;
		}
	}
	function refresh(svelteCodeValue) {
		const start = Date.now();
		try {
			virtualScriptCode = svelteEslintParser.parseForESLint(svelteCodeValue, {
				parser: tsParser
			})._virtualScriptCode;
		} catch (e) {
			console.error(e);
			virtualScriptCode = `message: ${e.message}`;
			time = `${Date.now() - start}ms`;
			return;
		}
		time = `${Date.now() - start}ms`;
	}
</script>

<div class="ast-explorer-root">
	<div class="ast-tools">{time}</div>
	<div class="ast-explorer">
		<MonacoEditor bind:this={sourceEditor} bind:code language="html" />
		<MonacoEditor
			bind:this={vscriptEditor}
			code={virtualScriptCode}
			language="typescript"
			readOnly
			editorOptions={{ wordWrap: 'on' }}
		/>
	</div>
</div>

<style>
	.ast-explorer-root {
		min-width: 1px;
		min-height: 1px;
		display: flex;
		flex-direction: column;
		height: 100%;
	}
	.ast-tools {
		text-align: right;
	}
	.ast-explorer {
		min-width: 1px;
		display: flex;
		height: 100%;
	}
</style>
