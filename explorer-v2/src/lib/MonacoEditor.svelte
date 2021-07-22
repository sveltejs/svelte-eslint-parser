<script>
	import { onDestroy, onMount, createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	import { loadMonacoEditor } from './scripts/monaco-loader';
	export let code = '';
	export let rightCode = '';
	export let language = 'javascript';
	export let readOnly = false;
	export let diffEditor = false;
	export let markers = [];
	export let rightMarkers = [];
	export let provideCodeActions = null;

	export let waiting = null;
	let rootElement,
		editor,
		setLeftValue,
		setRightValue,
		setLeftMarkers,
		setRightMarkers,
		getLeftEditor,
		codeActionProviderDisposable;
	const loadingMonaco = loadMonacoEditor();
	// eslint-disable-next-line no-use-before-define -- TODO
	$: loading = Promise.all([waiting, loadingMonaco]);
	$: {
		if (setLeftValue) {
			setLeftValue(code);
		}
	}
	$: {
		if (setRightValue) {
			setRightValue(rightCode);
		}
	}
	$: {
		if (setLeftMarkers) {
			setLeftMarkers(markers);
		}
	}
	$: {
		if (setRightMarkers) {
			setRightMarkers(rightMarkers);
		}
	}
	$: {
		disposeCodeActionProvider();
		if (provideCodeActions) {
			loadingMonaco.then((monaco) => {
				codeActionProviderDisposable = monaco.languages.registerCodeActionProvider(language, {
					provideCodeActions(model, range, context) {
						const editor = getLeftEditor?.();
						if (editor?.getModel().url !== model.url) {
							return {
								actions: [],
								dispose() {
									/* nop */
								}
							};
						}
						return provideCodeActions(model, range, context);
					}
				});
			});
		}
	}

	let started = false;
	onMount(async () => {
		started = true;
		await loading;
		const monaco = await loadingMonaco;
		const options = {
			value: code,
			readOnly,
			theme: 'vs-dark',
			language,
			automaticLayout: true,
			fontSize: 14,
			// tabSize: 2,
			minimap: {
				enabled: false
			},
			renderControlCharacters: true,
			renderIndentGuides: true,
			renderValidationDecorations: 'on',
			renderWhitespace: 'boundary',
			scrollBeyondLastLine: false
		};

		if (diffEditor) {
			editor = monaco.editor.createDiffEditor(rootElement, {
				originalEditable: true,
				...options
			});
			const original = monaco.editor.createModel(code, language);
			const modified = monaco.editor.createModel(rightCode, language);
			const leftEditor = editor.getOriginalEditor();
			const rightEditor = editor.getModifiedEditor();
			rightEditor.updateOptions({ readOnly: true });
			editor.setModel({ original, modified });
			original.onDidChangeContent(() => {
				const value = original.getValue();
				code = value;
			});

			setLeftValue = (code) => {
				const value = original.getValue();
				if (code !== value) {
					original.setValue(code);
				}
			};
			setRightValue = (code) => {
				const value = modified.getValue();
				if (code !== value) {
					modified.setValue(code);
				}
			};
			setLeftMarkers = (markers) => {
				updateMarkers(leftEditor, markers);
			};
			setRightMarkers = (markers) => {
				updateMarkers(rightEditor, markers);
			};
			getLeftEditor = () => leftEditor;

			setLeftMarkers(markers);
			setRightMarkers(rightMarkers);
		} else {
			editor = monaco.editor.create(rootElement, options);
			editor.onDidChangeModelContent(() => {
				const value = editor.getValue();
				code = value;
			});
			editor.onDidChangeCursorPosition((evt) => {
				dispatch('changeCursorPosition', evt);
			});
			editor.onDidFocusEditorText((evt) => {
				dispatch('focusEditorText', evt);
			});
			setLeftValue = (code) => {
				const value = editor.getValue();
				if (code !== value) {
					editor.setValue(code);
				}
			};
			setRightValue = () => {
				/* noop */
			};
			setLeftMarkers = (markers) => {
				updateMarkers(editor, markers);
			};
			setRightMarkers = () => {
				/* noop */
			};
			getLeftEditor = () => editor;

			setLeftMarkers(markers);
		}
	});
	onDestroy(() => {
		disposeCodeActionProvider();
		dispose(editor);
		// rootElement.innerHTML = ""
		editor = null;
	});

	export function setCursorPosition(loc, { columnOffset = 0 } = {}) {
		if (editor) {
			const leftEditor = diffEditor ? editor?.getOriginalEditor() : editor;
			leftEditor.setSelection({
				startLineNumber: loc.start.line,
				startColumn: loc.start.column + columnOffset,
				endLineNumber: loc.end.line,
				endColumn: loc.end.column + columnOffset
			});
		}
	}
	async function updateMarkers(editor, markers) {
		const monaco = await loadingMonaco;
		const model = editor.getModel();
		const id = editor.getId();
		monaco.editor.setModelMarkers(model, id, JSON.parse(JSON.stringify(markers)));
	}

	/**
	 * Dispose.
	 * @param {any} x The target object.
	 * @returns {void}
	 */
	function dispose(x) {
		if (x == null) {
			return;
		}
		if (x.getOriginalEditor) {
			dispose(x.getOriginalEditor());
		}
		if (x.getModifiedEditor) {
			dispose(x.getModifiedEditor());
		}
		if (x.getModel) {
			dispose(x.getModel());
		}
		if (x.dispose) {
			x.dispose();
		}
	}

	function disposeCodeActionProvider() {
		if (codeActionProviderDisposable) {
			codeActionProviderDisposable.dispose();
		}
	}

	function typewriter(node, { speed = 50 }) {
		const valid =
			node.childNodes.length === 0 ||
			(node.childNodes.length === 1 && node.childNodes[0].nodeType === Node.TEXT_NODE);

		if (!valid) {
			throw new Error(`This transition only works on elements with a single text node child`);
		}

		const texts = node.textContent.split(/(?=\S)/);
		const duration = texts.length * speed;

		return {
			duration,
			tick: (t) => {
				const i = ~~(texts.length * t);
				node.textContent = texts.slice(0, i).join('');
			}
		};
	}
</script>

{#await loading}
	{#if started}
		{#if diffEditor}
			<div
				class="eslint-editor-monaco-root eslint-editor-monaco-root--wait eslint-editor-monaco-root__flex"
			>
				<pre in:typewriter>Loading...</pre>
				<pre in:typewriter>Loading...</pre>
			</div>
		{:else}
			<pre
				class="eslint-editor-monaco-root eslint-editor-monaco-root--wait"
				in:typewriter>Loading...</pre>
		{/if}
	{/if}
{:then _}
	<div bind:this={rootElement} class="eslint-editor-monaco-root" />
{/await}

<style>
	.eslint-editor-monaco-root {
		width: 100%;
		height: 100%;
	}

	.eslint-editor-monaco-root--wait {
		color: #9cdcfe;
		border: 1px solid #cfd4db;
		background-color: #282c34;
		font-family: Menlo, Monaco, 'Courier New', monospace;
		font-size: 14px;
		line-height: 21px;
		padding-left: 52px;
	}
	.eslint-editor-monaco-root__flex {
		display: flex;
	}
	.eslint-editor-monaco-root__flex > * {
		height: 100%;
		width: 50%;
	}
</style>
