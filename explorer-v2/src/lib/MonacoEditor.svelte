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

	let rootElement,
		editor,
		setLeftValue,
		setRightValue,
		setLeftMarkers,
		setRightMarkers,
		getLeftEditor,
		codeActionProviderDisposable;
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
			loadMonacoEditor().then((monaco) => {
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

	onMount(async () => {
		const monaco = await loadMonacoEditor();
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
		const monaco = await loadMonacoEditor();
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
</script>

<div bind:this={rootElement} class="root" />

<style>
	.root {
		width: 100%;
		height: 100%;
	}
</style>
