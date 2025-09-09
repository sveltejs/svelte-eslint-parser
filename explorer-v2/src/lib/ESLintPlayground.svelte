<script>
	import { onDestroy, onMount } from 'svelte';
	import { Linter } from 'eslint';
	import * as svelteEslintParser from 'svelte-eslint-parser';
	import globals from 'globals';
	import ESLintEditor from './ESLintEditor.svelte';
	import RulesSettings from './RulesSettings.svelte';
	import { deserializeState, serializeState } from './scripts/state';
	import { DEFAULT_RULES_CONFIG, getURL } from './scripts/rules.js';

	const linter = new Linter();

	const DEFAULT_CODE =
		`<script>
    let a = 1;
    let b = 2;
    // let c = 2;
<` +
		`/script>

<input type="number" bind:value={a}>
<input type="number" bind:value={b}>
<input type="number" bind:value={c}>

<p>{a} + {b} + {c} = {a + b + c}</p>`;

	const state = deserializeState(
		(typeof window !== 'undefined' && window.location.hash.slice(1)) || ''
	);
	let code = state.code || DEFAULT_CODE;
	let rules = state.rules || Object.assign({}, DEFAULT_RULES_CONFIG);
	let messages = [];
	let time = '';

	$: hasLangTs = /lang\s*=\s*(?:"ts"|ts|'ts'|"typescript"|typescript|'typescript')/u.test(code);
	let tsParser = undefined;
	function setTSParser(parser) {
		if (typeof window !== 'undefined') {
			if (!window.process) {
				window.process = {
					cwd: () => '',
					env: {}
				};
			}
		}
		tsParser = parser;
	}
	$: {
		if (hasLangTs && !tsParser) {
			import('@typescript-eslint/parser').then(setTSParser);
		}
	}

	$: serializedString = (() => {
		const serializeCode = DEFAULT_CODE === code ? undefined : code;
		const serializeRules = equalsRules(DEFAULT_RULES_CONFIG, rules) ? undefined : rules;
		return serializeState({
			code: serializeCode,
			rules: serializeRules
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
	function onLintedResult(evt) {
		messages = evt.detail.messages;
		time = `${evt.detail.time}ms`;
	}
	function onUrlHashChange() {
		const newSerializedString =
			(typeof window !== 'undefined' && window.location.hash.slice(1)) || '';
		if (newSerializedString !== serializedString) {
			const state = deserializeState(newSerializedString);
			code = state.code || DEFAULT_CODE;
			rules = state.rules || Object.assign({}, DEFAULT_RULES_CONFIG);
		}
	}

	/** */
	function equalsRules(a, b) {
		const akeys = Object.keys(a).filter((k) => a[k] !== 'off');
		const bkeys = Object.keys(b).filter((k) => b[k] !== 'off');
		if (akeys.length !== bkeys.length) {
			return false;
		}

		for (const k of akeys) {
			if (a[k] !== b[k]) {
				return false;
			}
		}
		return true;
	}
</script>

<div class="playground-root">
	<div class="playground-tools">
		<span style:margin-left="16px">{time}</span>
	</div>
	<div class="playground-content">
		<RulesSettings bind:rules class="rules-settings" />
		<div class="editor-content">
			<ESLintEditor
				{linter}
				bind:code
				config={{
					languageOptions: {
						parser: svelteEslintParser,
						parserOptions: {
							ecmaVersion: 2024,
							sourceType: 'module',
							parser: { ts: tsParser, typescript: tsParser }
						},
						globals: {
							...globals.browser,
							...globals.es2021
						}
					},
					rules
				}}
				class="eslint-playground"
				on:result={onLintedResult}
			/>
			<div class="messages">
				<ol>
					{#each messages as msg, i (`${msg.line}:${msg.column}:${msg.ruleId}@${i}`)}
						<li class="message">
							[{msg.line}:{msg.column}]:
							<!-- eslint-disable-next-line svelte/no-navigation-without-resolve -- outside url -->
							{msg.message} (<a href={getURL(msg.ruleId)} target="_blank" rel="noopener noreferrer">
								{msg.ruleId}
							</a>)
						</li>
					{/each}
				</ol>
			</div>
		</div>
	</div>
</div>

<style>
	.playground-root {
		height: 100%;
	}
	.playground-tools {
		height: 24px;
	}
	.playground-content {
		display: flex;
		flex-wrap: wrap;
		height: calc(100% - 16px);
		border: 1px solid #cfd4db;
		background-color: #282c34;
		color: #f8c555;
	}

	.playground-content > .editor-content {
		height: 100%;
		flex: 1;
		display: flex;
		flex-direction: column;
		border-left: 1px solid #cfd4db;
		min-width: 1px;
	}

	.playground-content > .editor-content > .messages {
		height: 30%;
		width: 100%;
		overflow: auto;
		box-sizing: border-box;
		border-top: 1px solid #cfd4db;
		padding: 8px;
		font-size: 12px;
	}
</style>
