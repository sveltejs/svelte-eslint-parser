async function setupMonaco() {
	if (typeof window !== 'undefined') {
		const monacoScript =
			Array.from(document.head.querySelectorAll('script')).find(
				(script) => script.src && script.src.includes('monaco') && script.src.includes('vs/loader')
			) || (await appendMonacoEditorScript());
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
}

async function appendMonacoEditorScript() {
	let error = new Error();
	const urlList = [
		'https://cdn.jsdelivr.net/npm/monaco-editor/dev/vs/loader.min.js',
		'https://unpkg.com/monaco-editor@latest/min/vs/loader.js'
	];

	/* global MONACO_EDITOR_VERSION -- Define monaco-editor version */
	if (typeof MONACO_EDITOR_VERSION !== 'undefined') {
		urlList.unshift(
			`https://cdnjs.cloudflare.com/ajax/libs/monaco-editor/${MONACO_EDITOR_VERSION}/min/vs/loader.min.js`,
			`https://cdn.jsdelivr.net/npm/monaco-editor@${MONACO_EDITOR_VERSION}/dev/vs/loader.min.js`,
			`https://unpkg.com/monaco-editor/${MONACO_EDITOR_VERSION}/min/vs/loader.min.js`
		);
	}
	for (const url of urlList) {
		try {
			return await appendScript(url);
		} catch (e) {
			// eslint-disable-next-line no-console -- OK
			console.warn(`Failed to retrieve resource from ${url}`);
			error = e;
		}
	}
	throw error;
}

/** Appends a script tag. */
function appendScript(src) {
	const script = document.createElement('script');

	return new Promise((resolve, reject) => {
		script.src = src;
		script.onload = () => {
			script.onload = null;

			watch();

			function watch() {
				// @ts-expect-error -- global Monaco's require
				if (window.require) {
					resolve(script);

					return;
				}

				setTimeout(watch, 200);
			}
		};
		script.onerror = (e) => {
			reject(e);
			document.head.removeChild(script);
		};
		document.head.append(script);
	});
}

let setupedMonaco = null;
let editorLoaded = null;

export async function loadMonacoEditor() {
	await (setupedMonaco || (setupedMonaco = setupMonaco()));
	return (
		editorLoaded ||
		(editorLoaded = new Promise((resolve) => {
			if (typeof window !== 'undefined') {
				// eslint-disable-next-line n/no-missing-require -- ignore
				window.require(['vs/editor/editor.main'], (r) => {
					resolve(r);
				});
			}
		}))
	);
}
