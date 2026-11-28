export const DARK_THEME_NAME = 'github-dark';
export const LIGHT_THEME_NAME = 'github-light';

import { browser } from '$app/environment';
import EditorWorker from 'monaco-editor/editor/editor.worker.js?worker';
import CssWorker from 'monaco-editor/languages/features/css/css.worker.js?worker';
import HtmlWorker from 'monaco-editor/languages/features/html/html.worker.js?worker';
import JsonWorker from 'monaco-editor/languages/features/json/json.worker.js?worker';
import TsWorker from 'monaco-editor/languages/features/typescript/ts.worker.js?worker';

let editorLoaded = null;
let enhancedLanguagesSetup = null;

export async function loadMonacoEditor() {
	if (!browser) {
		// Monaco editor can only be loaded in the browser.
		return new Promise(() => {
			// Never resolve, since Monaco editor cannot be loaded in the server environment.
		});
	}
	// Bundle monaco-editor with Vite. CDN builds (jsDelivr `+esm`, esm.sh) cannot load its language modules and workers.
	globalThis.MonacoEnvironment ??= { getWorker };
	const monaco = await (editorLoaded ||= import('monaco-editor'));
	enhancedLanguagesSetup ||= setupEnhancedLanguages(monaco);
	await new Promise((resolve) => setTimeout(resolve, 1000));
	return monaco;
}

/** Create the web worker for the given label. */
function getWorker(_moduleId, label) {
	switch (label) {
		case 'json':
			return new JsonWorker();
		case 'css':
		case 'scss':
		case 'less':
			return new CssWorker();
		case 'html':
		case 'handlebars':
		case 'razor':
			return new HtmlWorker();
		case 'typescript':
		case 'javascript':
			return new TsWorker();
		default:
			return new EditorWorker();
	}
}

/**
 * Register a syntax highlighter using Shiki.
 */
async function setupEnhancedLanguages(monaco) {
	const monacoLanguageIds = new Set(monaco.languages.getLanguages().map((l) => l.id));
	const [shikiWeb, shikiMonaco, oniguruma] = await Promise.all([
		importFromEsmSh('shiki/bundle/web'),
		importFromEsmSh('@shikijs/monaco'),
		importFromEsmSh('shiki/engine/oniguruma')
	]);
	const highlighter = await shikiWeb.createHighlighter({
		themes: [DARK_THEME_NAME, LIGHT_THEME_NAME],
		langs: [],
		engine: oniguruma.createOnigurumaEngine(importFromEsmSh('shiki/wasm'))
	});
	// Register the themes from Shiki, and provide syntax highlighting for Monaco.
	shikiMonaco.shikiToMonaco(highlighter, monaco);
	await Promise.all(
		['javascript', 'typescript', 'json', 'html', 'svelte'].map(async (id) => {
			if (!monacoLanguageIds.has(id)) {
				monaco.languages.register({ id });
			}
			await registerShikiHighlighter(monaco, highlighter, id);
		})
	);
}

async function registerShikiHighlighter(monaco, highlighter, languageId) {
	const models = monaco.editor.getModels().filter((model) => model.getLanguageId() === languageId);
	if (!models.length) {
		monaco.languages.onLanguageEncountered(languageId, async () => {
			await registerShikiHighlighterLanguage(monaco, highlighter, languageId);
		});
	} else {
		await registerShikiHighlighterLanguage(monaco, highlighter, languageId);
	}
}

async function registerShikiHighlighterLanguage(monaco, highlighter, languageId) {
	const [shikiMonaco] = await Promise.all([importFromEsmSh('@shikijs/monaco')]);
	await highlighter.loadLanguage(languageId);
	const editorThemes = monaco.editor.getEditors().map((editor) => {
		return [editor, editor.getRawOptions().theme];
	});
	// Register the themes from Shiki, and provide syntax highlighting for Monaco.
	shikiMonaco.shikiToMonaco(highlighter, monaco);
	for (const [editor, theme] of editorThemes) {
		editor.updateOptions({ theme });
	}
}

function importFromCDN(path) {
	return import(/* @vite-ignore */ path);
}

function importFromEsmSh(path) {
	return importFromCDN(`https://esm.sh/${path}`);
}
