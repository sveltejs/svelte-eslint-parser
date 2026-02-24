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
	let scopeJson = {};
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
		let scopeManager;
		const start = Date.now();
		try {
			scopeManager = svelteEslintParser.parseForESLint(svelteValue, {
				parser: { ts: tsParser, typescript: tsParser }
			}).scopeManager;
		} catch (e) {
			scopeJson = {
				json: JSON.stringify({
					message: e.message,
					...e
				}),
				locations: []
			};
			time = `${Date.now() - start}ms`;
			return;
		}
		time = `${Date.now() - start}ms`;
		const json = createScopeJson(options, scopeManager);
		scopeJson = json;
	}
	function handleFocus(editor) {
		modeEditor = editor;
	}
	function handleCursor(evt, editor) {
		if (modeEditor !== editor || !scopeJson) {
			return;
		}

		const position = evt.position;
		if (editor === 'source') {
			const locData = findLoc(scopeJson, 'sourceLoc');
			if (locData) {
				jsonEditor.setCursorPosition(locData.jsonLoc);
			}
		} else if (editor === 'json') {
			const locData = findLoc(scopeJson, 'jsonLoc');
			if (locData) {
				sourceEditor.setCursorPosition(locData.sourceLoc, {
					columnOffset: 1
				});
			}
		}

		function findLoc(scopeJson, locName) {
			let locData = scopeJson.locations.find((l) => locInPoint(l[locName], position));
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

	class ScopeJsonContext {
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
	 * Build Scope JSON
	 */
	function createScopeJson(options, scopeManager) {
		const ctx = new ScopeJsonContext();
		processScope(options, ctx, scopeManager.globalScope);
		return ctx;
	}

	/**
	 * @param {object} options
	 * @param {ScopeJsonContext} ctx
	 * @param {import('eslint-scope').Scope} scope
	 */
	function processScope(options, ctx, scope) {
		ctx.appendIndent().appendText('{\n').indent();
		ctx.appendIndent().appendText(`"type": "${scope.type}",\n`);
		ctx.appendIndent().appendText(`"variables": [\n`).indent();
		scope.variables.forEach((variable, index) => {
			processVariable(options, ctx, variable);
			if (scope.variables.length - 1 !== index) {
				ctx.appendText(',');
			}
			ctx.appendText('\n');
		});
		ctx.outdent().appendIndent().appendText(`],\n`);
		ctx.appendIndent().appendText(`"references": [\n`).indent();
		scope.references.forEach((reference, index) => {
			processReference(options, ctx, reference);
			if (scope.references.length - 1 !== index) {
				ctx.appendText(',');
			}
			ctx.appendText('\n');
		});
		ctx.outdent().appendIndent().appendText(`],\n`);
		ctx.appendIndent().appendText(`"childScopes": [\n`).indent();
		scope.childScopes.forEach((childScope, index) => {
			processScope(options, ctx, childScope);
			if (scope.childScopes.length - 1 !== index) {
				ctx.appendText(',');
			}
			ctx.appendText('\n');
		});
		ctx.outdent().appendIndent().appendText(`],\n`);
		ctx.appendIndent().appendText(`"through": [\n`).indent();
		scope.through.forEach((through, index) => {
			processReference(options, ctx, through);
			if (scope.through.length - 1 !== index) {
				ctx.appendText(',');
			}
			ctx.appendText('\n');
		});
		ctx.outdent().appendIndent().appendText(`]\n`);
		ctx.outdent().appendIndent().appendText('}');
	}

	/**
	 * @param {object} options
	 * @param {ScopeJsonContext} ctx
	 * @param {import('eslint-scope').Variable} variable
	 */
	function processVariable(options, ctx, variable) {
		ctx.appendIndent().appendText('{\n').indent();
		ctx.appendIndent().appendText(`"name": "${variable.name}",\n`);
		ctx.appendIndent().appendText(`"identifiers": [\n`).indent();
		variable.identifiers.forEach((identifier, index) => {
			ctx.appendIndent();
			processJsonValue(options, ctx, identifier);
			if (variable.identifiers.length - 1 !== index) {
				ctx.appendText(',');
			}
			ctx.appendText('\n');
		});
		ctx.outdent().appendIndent().appendText(`],\n`);
		ctx.appendIndent().appendText(`"defs": [\n`).indent();
		variable.defs.forEach((def, index) => {
			ctx.appendIndent();
			processJsonValue(options, ctx, def);
			if (variable.defs.length - 1 !== index) {
				ctx.appendText(',');
			}
			ctx.appendText('\n');
		});
		ctx.outdent().appendIndent().appendText(`],\n`);
		ctx.appendIndent().appendText(`"references": [\n`).indent();
		variable.references.forEach((reference, index) => {
			processReference(options, ctx, reference);
			if (variable.references.length - 1 !== index) {
				ctx.appendText(',');
			}
			ctx.appendText('\n');
		});
		ctx.outdent().appendIndent().appendText(`]\n`);
		ctx.outdent().appendIndent().appendText('}');
	}

	/**
	 * @param {object} options
	 * @param {ScopeJsonContext} ctx
	 * @param {import('eslint-scope').Reference} reference
	 */
	function processReference(options, ctx, reference) {
		ctx.appendIndent().appendText('{\n').indent();
		ctx.appendIndent().appendText(`"identifier": `);
		processJsonValue(options, ctx, reference.identifier);
		ctx.appendText(',\n');
		ctx.appendIndent().appendText(`"from": `);
		processJsonValue(options, ctx, reference.from.type);
		ctx.appendText(',\n');
		ctx.appendIndent().appendText(`"resolved": `);
		processJsonValue(options, ctx, reference.resolved?.defs[0]?.name ?? null);
		ctx.appendText(',\n');
		ctx.appendIndent().appendText(`"init": `);
		processJsonValue(options, ctx, reference.init ?? null);
		ctx.appendText('\n');
		ctx.outdent().appendIndent().appendText('}');
	}
</script>

<div class="ast-explorer-root">
	<div class="ast-tools">{time}<AstOptions bind:options /></div>
	<div class="ast-explorer">
		<MonacoEditor
			bind:this={sourceEditor}
			bind:code={svelteValue}
			language="svelte"
			on:focusEditorText={() => handleFocus('source')}
			on:changeCursorPosition={(e) => handleCursor(e.detail, 'source')}
		/>
		<MonacoEditor
			bind:this={jsonEditor}
			code={scopeJson.json}
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
