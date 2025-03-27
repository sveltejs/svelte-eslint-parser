<script>
	// eslint-disable-next-line @eslint-community/eslint-comments/disable-enable-pair -- ignore
	/* eslint-disable no-useless-escape -- ignore */
	import MonacoEditor from './MonacoEditor.svelte';
	import AstOptions from './AstOptions.svelte';
	import * as svelteEslintParser from 'svelte-eslint-parser';
	import { processJsonValue } from './scripts/json';

	let options = {
		showLocations: false
	};
	let svelteValue = `<script>
    let a = 1;
    let b = 2;
<\/script>

<input type="number" bind:value={a}>
<input type="number" bind:value={b}>

<p>{a} + {b} = {a + b}</p>`;
	let astJson = {};
	let modeEditor = '';
	let time = '';

	let jsonEditor, sourceEditor;

	$: hasLangTs = /lang\s*=\s*(?:"ts"|ts|'ts'|"typescript"|typescript|'typescript')/u.test(
		svelteValue
	);

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

	$: {
		refresh(options, svelteValue, tsParser);
	}

	function refresh(options, svelteValue, tsParser) {
		let ast;
		const start = Date.now();
		try {
			ast = svelteEslintParser.parseForESLint(svelteValue, {
				parser: { ts: tsParser, typescript: tsParser }
			}).ast;
		} catch (e) {
			ast = {
				message: e.message,
				...e
			};
		}
		time = `${Date.now() - start}ms`;
		const json = createAstJson(options, ast);
		astJson = json;
	}
	function handleFocus(editor) {
		modeEditor = editor;
	}
	function handleCursor(evt, editor) {
		if (modeEditor !== editor || !astJson) {
			return;
		}

		const position = evt.position;
		if (editor === 'source') {
			const locData = findLoc(astJson, 'sourceLoc');
			if (locData) {
				jsonEditor.setCursorPosition(locData.jsonLoc);
			}
		} else if (editor === 'json') {
			const locData = findLoc(astJson, 'jsonLoc');
			if (locData) {
				sourceEditor.setCursorPosition(locData.sourceLoc, {
					columnOffset: 1
				});
			}
		}

		function findLoc(astJson, locName) {
			let locData = astJson.locations.find((l) => locInPoint(l[locName], position));
			let nextLocData;
			while (
				locData &&
				(nextLocData = locData.locations.find((l) => locInPoint(l[locName], position)))
			) {
				locData = nextLocData;
			}
			return locData;
		}

		function locInPoint(loc, pos) {
			if (loc.start.line < pos.lineNumber && pos.lineNumber < loc.end.line) {
				return true;
			}
			if (loc.start.line === pos.lineNumber && pos.lineNumber === loc.end.line) {
				return loc.start.column <= pos.column && pos.column < loc.end.column;
			}
			if (loc.start.line === pos.lineNumber && pos.lineNumber < loc.end.line) {
				return loc.start.column <= pos.column;
			}
			if (loc.start.line < pos.lineNumber && pos.lineNumber === loc.end.line) {
				return pos.column < loc.end.column;
			}
			return false;
		}
	}

	class AstJsonContext {
		constructor() {
			this.json = '';
			this.jsonPosition = { line: 1, column: 1 };
			this.locations = [];
			this._indentOffset = 0;
			this._stack = null;
		}

		pushNode(node) {
			this._stack = {
				upper: this._stack,
				node,
				jsonLocStart: { ...this.jsonPosition },
				locations: []
			};
		}

		popNode() {
			const loc = {
				node: this._stack.node,
				sourceLoc: this._stack.node.loc,
				jsonLoc: {
					start: this._stack.jsonLocStart,
					end: { ...this.jsonPosition }
				},
				locations: this._stack.locations
			};

			this._stack = this._stack.upper;
			if (this._stack) {
				this._stack.locations.push(loc);
			} else {
				this.locations.push(loc);
			}
		}

		appendText(text) {
			const str = String(text);
			this.json += str;
			const lines = str.split('\n');
			if (lines.length > 1) {
				this.jsonPosition = {
					line: this.jsonPosition.line + lines.length - 1,
					column: lines.pop().length + 1
				};
			} else {
				this.jsonPosition.column += str.length;
			}
			return this;
		}

		appendIndent() {
			return this.appendText('  '.repeat(this._indentOffset));
		}

		indent() {
			this._indentOffset++;
			return this;
		}

		outdent() {
			this._indentOffset--;
			return this;
		}
	}

	/**
	 * Build AST JSON
	 */
	function createAstJson(options, value) {
		const ctx = new AstJsonContext();
		processJsonValue(options, ctx, value);
		return ctx;
	}
</script>

<div class="ast-explorer-root">
	<div class="ast-tools">{time}<AstOptions bind:options /></div>
	<div class="ast-explorer">
		<MonacoEditor
			bind:this={sourceEditor}
			bind:code={svelteValue}
			language="html"
			on:focusEditorText={() => handleFocus('source')}
			on:changeCursorPosition={(e) => handleCursor(e.detail, 'source')}
		/>
		<MonacoEditor
			bind:this={jsonEditor}
			code={astJson.json}
			language="json"
			readOnly
			on:focusEditorText={() => handleFocus('json')}
			on:changeCursorPosition={(e) => handleCursor(e.detail, 'json')}
		/>
	</div>
</div>

<style>
	.ast-explorer-root {
		min-width: 1px;
		min-height: 1px;
		display: flex;
		flex-direction: column;
		width: 100%;
		height: calc(100vh - 80px);
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
