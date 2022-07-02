<script>
	// eslint-disable-next-line eslint-comments/disable-enable-pair -- ignore
	/* eslint-disable no-useless-escape -- ignore */
	import MonacoEditor from './MonacoEditor.svelte';
	import * as svelteEslintParser from 'svelte-eslint-parser';

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
				window.require.define('@typescript-eslint/parser', parser);
			}
		})
		.then(() => {
			loaded = true;
		});

	let svelteValue = `<script>
    let a = 1; 
    let b = 2;
<\/script>

<input type="number" bind:value={a}>
<input type="number" bind:value={b}>

<p>{a} + {b} = {a + b}</p>`;
	let virtualScriptCode = '';
	let time = '';

	let vscriptEditor, sourceEditor;
	$: {
		if (loaded) {
			refresh(svelteValue);
		}
	}
	function refresh(svelteValue) {
		const start = Date.now();
		try {
			virtualScriptCode = svelteEslintParser.parseForESLint(svelteValue, {
				parser: '@typescript-eslint/parser'
			})._virtualScriptCode;
		} catch (e) {
			// eslint-disable-next-line no-console -- demo
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
		<MonacoEditor bind:this={sourceEditor} bind:code={svelteValue} language="html" />
		<MonacoEditor
			bind:this={vscriptEditor}
			code={virtualScriptCode}
			language="typescript"
			readOnly
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
