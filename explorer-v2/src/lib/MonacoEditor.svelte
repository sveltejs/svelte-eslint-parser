<script>
	import { onDestroy, onMount, createEventDispatcher } from 'svelte';

	const dispatch = createEventDispatcher();

	import { monacoEditorLoad } from './scripts/monaco-loader';
	export let code = '';
	export let rightCode = '';
	export let language = 'json';
	export let readOnly = false;
	export let diffEditor = false;
	export let markers = [];
	export let rightMarkers = [];

	let rootElement, editor, setLeftValue, setRightValue, setLeftMarkers, setRightMarkers;
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

	onMount(async () => {
		const monaco = await monacoEditorLoad;
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
		const monaco = await monacoEditorLoad;
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
</script>

<div bind:this={rootElement} class="root" />

<style>
	.root {
		width: 100%;
		height: 100%;
	}
</style>
