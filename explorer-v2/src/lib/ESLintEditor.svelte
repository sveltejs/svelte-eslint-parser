<script>
	import { builtinRules } from 'eslint/use-at-your-own-risk';
	import MonacoEditor from './MonacoEditor.svelte';
	import { loadMonacoEditor } from './scripts/monaco-loader';
	import { createEventDispatcher, onMount } from 'svelte';
	import { SvelteMap } from 'svelte/reactivity';

	const dispatch = createEventDispatcher();

	export let linter = null;
	export let code = '';
	export let config = {};
	export let options = {};
	export let fix = true;

	let fixedValue = code;
	let leftMarkers = [];
	let rightMarkers = [];

	let messageMap = new SvelteMap();

	$: showApplyFix = fix && fixedValue !== code;
	$: {
		lint(linter, code, config, options);
	}

	onMount(() => {
		lint(linter, code, config, options);
	});

	async function lint(linter, code, config, options) {
		messageMap.clear();
		/* eslint-disable no-param-reassign -- ignore */
		linter = await linter;
		if (!linter) {
			return;
		}
		code = await code;
		config = await config;
		options = await options;
		/* eslint-enable no-param-reassign -- ignore */

		const start = Date.now();
		const messages = linter.verify(code, config, options);
		const time = Date.now() - start;

		dispatch('time', time);

		const fixResult = linter.verifyAndFix(code, config, options);
		fixedValue = fixResult.output;

		dispatch('result', {
			messages,
			time,
			output: fixResult.output,
			fixedMessages: fixResult.messages
		});

		leftMarkers = await Promise.all(messages.map((m) => messageToMarker(m, messageMap)));
		rightMarkers = await Promise.all(fixResult.messages.map((m) => messageToMarker(m)));
	}

	function applyFix() {
		code = fixedValue;
	}
	/** message to marker */
	async function messageToMarker(message, messageMap) {
		const monaco = await loadMonacoEditor();
		const rule = message.ruleId && builtinRules.get(message.ruleId);
		const docUrl = rule && rule.meta && rule.meta.docs && rule.meta.docs.url;
		const startLineNumber = ensurePositiveInt(message.line, 1);
		const startColumn = ensurePositiveInt(message.column, 1);
		const endLineNumber = ensurePositiveInt(message.endLine, startLineNumber);
		const endColumn = ensurePositiveInt(message.endColumn, startColumn + 1);
		const code = docUrl
			? { value: message.ruleId, link: docUrl, target: docUrl }
			: message.ruleId || 'FATAL';
		const marker = {
			code,
			severity: monaco.MarkerSeverity.Error,
			source: 'ESLint',
			message: message.message,
			startLineNumber,
			startColumn,
			endLineNumber,
			endColumn
		};
		if (messageMap) {
			messageMap.set(computeKey(marker), message);
		}
		return marker;
	}

	/**
	 * Ensure that a given value is a positive value.
	 * @param {number|undefined} value The value to check.
	 * @param {number} defaultValue The default value which is used if the `value` is undefined.
	 * @returns {number} The positive value as the result.
	 */
	function ensurePositiveInt(value, defaultValue) {
		return Math.max(1, (value !== undefined ? value : defaultValue) | 0);
	}

	function provideCodeActions(model, _range, context) {
		if (context.only !== 'quickfix') {
			return {
				actions: [],
				dispose() {
					/* nop */
				}
			};
		}

		const actions = [];
		for (const marker of context.markers) {
			const message = messageMap.get(computeKey(marker));
			if (!message) {
				continue;
			}
			if (message.fix) {
				actions.push(
					createQuickfixCodeAction(`Fix this ${message.ruleId} problem`, marker, model, message.fix)
				);
			}
			if (message.suggestions) {
				for (const suggestion of message.suggestions) {
					actions.push(
						createQuickfixCodeAction(
							`${suggestion.desc} (${message.ruleId})`,
							marker,
							model,
							suggestion.fix
						)
					);
				}
			}
		}

		return {
			actions,
			dispose() {
				/* nop */
			}
		};
	}

	/**
	 * Computes the key string from the given marker.
	 * @param {import('monaco-editor').editor.IMarkerData} marker marker
	 * @returns {string} the key string
	 */
	function computeKey(marker) {
		const code =
			(typeof marker.code === 'string' ? marker.code : marker.code && marker.code.value) || '';
		return `[${marker.startLineNumber},${marker.startColumn},${marker.endLineNumber},${marker.endColumn}]-${code}`;
	}
	/**
	 * Create quickfix code action.
	 * @param {string} title title
	 * @param {import('monaco-editor').editor.IMarkerData} marker marker
	 * @param {import('monaco-editor').editor.ITextModel} model model
	 * @param { { range: [number, number], text: string } } fix fix data
	 * @returns {import('monaco-editor').languages.CodeAction} CodeAction
	 */
	function createQuickfixCodeAction(title, marker, model, fix) {
		const start = model.getPositionAt(fix.range[0]);
		const end = model.getPositionAt(fix.range[1]);
		/**
		 * @type {import('monaco-editor').IRange}
		 */
		const editRange = {
			startLineNumber: start.lineNumber,
			startColumn: start.column,
			endLineNumber: end.lineNumber,
			endColumn: end.column
		};
		return {
			title,
			diagnostics: [marker],
			kind: 'quickfix',
			edit: {
				edits: [
					{
						resource: model.uri,
						edit: {
							range: editRange,
							text: fix.text
						}
					}
				]
			}
		};
	}
</script>

<div class="eslint-editor">
	<MonacoEditor
		bind:code
		bind:rightCode={fixedValue}
		language="html"
		diffEditor={fix}
		markers={leftMarkers}
		{rightMarkers}
		{provideCodeActions}
	/>
	<div class="eslint-editor__tools">
		{#if showApplyFix}
			<button on:click={applyFix}>Apply Fix</button>
		{/if}
	</div>
</div>

<style>
	.eslint-editor {
		height: 100%;
		position: relative;
	}
	.eslint-editor__tools {
		display: flex;
		height: 42px;
		position: absolute;
		right: 16px;
		bottom: 16px;
		padding: 8px;
	}
	.eslint-editor__tools > button {
		cursor: pointer;
		background-color: transparent;
		color: #ddd;
		border: solid #ddd 1px;
		border-radius: 4px;
		outline: none;
		padding: 0 16px;
		appearance: none;
	}
	.eslint-editor__tools > button:hover {
		background-color: rgba(255, 255, 255, 0.2);
	}
</style>
