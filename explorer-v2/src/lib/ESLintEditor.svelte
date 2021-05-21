<script>
	import Linter from 'eslint4b';
	import MonacoEditor from './MonacoEditor.svelte';
	import * as svelteEslintParser from 'svelte-eslint-parser';
	import { monacoEditorLoad } from './scripts/monaco-loader';
	import { createEventDispatcher, onMount } from 'svelte';

	const dispatch = createEventDispatcher();

	const linter = new Linter();
	linter.defineParser('svelte-eslint-parser', svelteEslintParser);

	export let modelValue = '';
	export let rules = {};
	export let useEslintPluginSvelte3 = false;

	let fixedValue = modelValue;
	let leftMarkers = [];
	let rightMarkers = [];

	$: {
		lint(modelValue, useEslintPluginSvelte3, rules);
	}

	onMount(() => {
		lint(modelValue, useEslintPluginSvelte3, rules);
	});

	async function getEslintPluginSvelte3Options() {
		const pluginSvelte3 = await import('eslint-plugin-svelte3');
		return {
			preprocess: pluginSvelte3.processors.svelte3.preprocess,
			postprocess: pluginSvelte3.processors.svelte3.postprocess
		};
	}

	async function lint(code, useEslintPluginSvelte3, rules) {
		const config = {
			parser: useEslintPluginSvelte3 ? undefined : 'svelte-eslint-parser',
			parserOptions: {
				ecmaVersion: 2020,
				sourceType: 'module'
			},
			rules,
			env: {
				browser: true,
				es2021: true
			}
		};
		const options = useEslintPluginSvelte3 ? await getEslintPluginSvelte3Options() : {};

		const start = Date.now();
		const messages = linter.verify(code, config, options);
		const time = Date.now() - start;

		dispatch('time', time);

		dispatch('updateMessages', messages);

		const fixResult = linter.verifyAndFix(code, config, options);
		fixedValue = fixResult.output;

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
	bind:modelValue
	bind:rightValue={fixedValue}
	language="html"
	diffEditor
	markers={leftMarkers}
	{rightMarkers}
/>

<style></style>
