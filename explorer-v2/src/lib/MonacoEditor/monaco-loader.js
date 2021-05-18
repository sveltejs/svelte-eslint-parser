if (typeof window !== 'undefined') {
	const monacoScript = Array.from(document.head.querySelectorAll('script')).find(
		(script) => script.src && script.src.includes('monaco')
	);
	window.require.config({
		paths: {
			vs: monacoScript.src.replace(/\/vs\/.*$/u, '/vs')
		},
		'vs/nls': {
			availableLanguages: {
				'*': 'ja'
			}
		}
	});
}
const editorLoaded = new Promise((resolve) => {
	if (typeof window !== 'undefined')
		// eslint-disable-next-line node/no-missing-require -- ignore
		window.require(['vs/editor/editor.main'], (r) => {
			resolve(r);
		});
});

export const monacoEditorLoad = editorLoaded;
