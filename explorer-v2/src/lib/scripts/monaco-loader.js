export const DARK_THEME_NAME = 'github-dark';
export const LIGHT_THEME_NAME = 'github-light';

import { browser } from '$app/environment';

let editorLoaded = null;

export async function loadMonacoEditor() {
	if (!browser) {
		// Monaco editor can only be loaded in the browser.
		return new Promise(() => {
			// Never resolve, since Monaco editor cannot be loaded in the server environment.
		});
	}
	let rawMonaco = await (editorLoaded || (editorLoaded = loadMonacoFromEsmCdn()));
	const monaco = 'm' in rawMonaco ? rawMonaco.m || rawMonaco : rawMonaco;
	setupEnhancedLanguages(monaco);
	await new Promise((resolve) => setTimeout(resolve, 1000));
	return monaco;
}

/** Load the Monaco editor from the ESM CDN. */
async function loadMonacoFromEsmCdn() {
	let error = new Error();
	const urlList = [
		{
			script: 'https://cdn.jsdelivr.net/npm/monaco-editor/+esm',
			style: 'https://cdn.jsdelivr.net/npm/monaco-editor/min/vs/editor/editor.main.css'
		}
	];

	/* global MONACO_EDITOR_VERSION -- Define monaco-editor version */
	if (typeof MONACO_EDITOR_VERSION !== 'undefined') {
		urlList.unshift({
			script: `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_EDITOR_VERSION}/+esm`,
			style: `https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_EDITOR_VERSION}/min/vs/editor/editor.main.css`
		});
	}
	for (const url of urlList) {
		try {
			const result = await importFromCDN(url.script);

			if (typeof document !== 'undefined') {
				const link = document.createElement('link');
				link.rel = 'stylesheet';
				link.href = url.style;
				document.head.append(link);
			}
			return result;
		} catch (e) {
			// eslint-disable-next-line no-console -- OK
			console.warn(`Failed to retrieve resource from ${url}`);
			error = e;
		}
	}
	throw error;
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
