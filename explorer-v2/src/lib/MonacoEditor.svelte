<script module>
	const appStarting = new Promise((resolve) => setTimeout(resolve, 300));
</script>

<script>
	import { onDestroy, onMount, tick } from 'svelte';
	import { DARK_THEME_NAME, loadMonacoEditor } from './scripts/monaco-loader';

	let {
		code = $bindable(''),
		rightCode = '',
		language = 'javascript',
		readOnly = false,
		diffEditor = false,
		markers = [],
		rightMarkers = [],
		provideCodeActions = null,
		editorOptions = {},
		waiting = null,
		onchangecursorposition,
		onfocuseditortext
	} = $props();

	let rootElement = $state();
	let editor, getLeftEditor;
	let setLeftValue = $state();
	let setRightValue = $state();
	let setLeftMarkers = $state();
	let setRightMarkers = $state();
	const loadingMonaco = loadMonacoEditor();
	const starting = appStarting;

	const loading = $derived(Promise.all([waiting, loadingMonaco, starting]));
	$effect(() => {
		if (setLeftValue) {
			setLeftValue(code);
		}
	});
	$effect(() => {
		if (setRightValue) {
			setRightValue(rightCode);
		}
	});
	$effect(() => {
		if (setLeftMarkers) {
			setLeftMarkers(markers);
		}
	});
	$effect(() => {
		if (setRightMarkers) {
			setRightMarkers(rightMarkers);
		}
	});
	$effect(() => {
		const provide = provideCodeActions;
		if (!provide) {
			return undefined;
		}
		let disposed = false;
		let disposable = null;
		loadingMonaco.then((monaco) => {
			if (!disposed) {
				disposable = setupCodeActionProvider(monaco, provide);
			}
		});
		return () => {
			disposed = true;
			disposable?.dispose();
		};
	});

	let started = $state(false);
	onMount(async () => {
		started = true;
		await loading;
		const monaco = await loadingMonaco;
		await tick();
		const options = {
			value: code,
			readOnly,
			theme: DARK_THEME_NAME,
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
			scrollBeyondLastLine: false,
			useInlineViewWhenSpaceIsLimited: false,
			...editorOptions
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
				onchangecursorposition?.(evt);
			});
			editor.onDidFocusEditorText((evt) => {
				onfocuseditortext?.(evt);
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
		// Dispose the editor before its models. A diff editor throws if its models are disposed first.
		const model = x.getModel?.();
		x.dispose?.();
		if (model?.original || model?.modified) {
			model.original?.dispose();
			model.modified?.dispose();
		} else {
			model?.dispose?.();
		}
	}

	function setupCodeActionProvider(monaco, provideCodeActions) {
		return monaco.languages.registerCodeActionProvider(language, {
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
	}

	function loadingTypewriter(node) {
		const text = 'Loading...';
		const duration = 300;

		return {
			duration,
			tick: (t) => {
				const i = ~~(text.length * t);
				node.textContent = text.slice(0, i);
			}
		};
	}
</script>

{#await loading}
	{#if started}
		<div
			class="eslint-editor-monaco-root eslint-editor-monaco-root--wait"
			in:loadingTypewriter
		></div>
	{/if}
{:then}
	<div bind:this={rootElement} class="eslint-editor-monaco-root"></div>
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
		box-sizing: border-box;
	}
</style>
