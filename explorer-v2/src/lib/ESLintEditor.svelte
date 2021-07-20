<script>
	import MonacoEditor from './MonacoEditor.svelte';
	import { monacoEditorLoad } from './scripts/monaco-loader';
	import { createEventDispatcher, onMount } from 'svelte';

	const dispatch = createEventDispatcher();

	export let linter = null;
	export let code = '';
	export let config = {};
	export let options = {};

	let fixedValue = code;
	let leftMarkers = [];
	let rightMarkers = [];

	$: {
		lint(linter, code, config, options);
	}

	onMount(() => {
		lint(linter, code, config, options);
	});

	async function lint(linter, code, config, options) {
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

		leftMarkers = await Promise.all(messages.map(messageToMarker));
		rightMarkers = await Promise.all(fixResult.messages.map(messageToMarker));
	}

	/** message to marker */
	async function messageToMarker(message) {
		const monaco = await monacoEditorLoad;
		const rule = message.ruleId && linter.getRules().get(message.ruleId);
		const docUrl = rule && rule.meta && rule.meta.docs && rule.meta.docs.url;
		const startLineNumber = ensurePositiveInt(message.line, 1);
		const startColumn = ensurePositiveInt(message.column, 1);
		const endLineNumber = ensurePositiveInt(message.endLine, startLineNumber);
		const endColumn = ensurePositiveInt(message.endColumn, startColumn + 1);
		const code = docUrl
			? { value: message.ruleId, link: docUrl, target: docUrl }
			: message.ruleId || 'FATAL';
		return {
			code,
			severity: monaco.MarkerSeverity.Error,
			source: 'ESLint',
			message: message.message,
			startLineNumber,
			startColumn,
			endLineNumber,
			endColumn
		};
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
</script>

<MonacoEditor
	bind:code
	bind:rightCode={fixedValue}
	language="html"
	diffEditor
	markers={leftMarkers}
	{rightMarkers}
/>

<style></style>
