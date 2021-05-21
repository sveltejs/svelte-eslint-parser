import staticAdapter from '@sveltejs/adapter-static';
import { resolve } from 'path';
import stringReplace from './build-system/vite-plugins/vite-plugin-string-replace.js';
/** @type {import('@sveltejs/kit').Config} */
const config = {
	kit: {
		paths: {
			base: '/svelte-eslint-parser'
		},
		// hydrate the <div id="svelte"> element in src/app.html
		target: '#svelte',

		adapter: staticAdapter({
			// default options are shown
			pages: 'build',
			assets: 'build',
			fallback: null
		}),
		vite: {
			resolve: {
				alias: {
					assert: resolve('./build-system/shim/assert.js'),
					lodash: resolve('./build-system/shim/lodash.js'),
					path: resolve('./build-system/shim/path.js'),
					fs: resolve('./build-system/shim/fs.js'),
					'eslint-scope': resolve('./build-system/shim/eslint-scope.js'),
					'svelte-eslint-parser': resolve('./build-system/shim/svelte-eslint-parser.js')
				}
			},
			build: {
				// minify: true,
				get commonjsOptions() {
					return {
						include: [
							/node_modules/,
							resolve('./build-system/shim/assert.js'),
							resolve('./build-system/shim/eslint-scope.js'),
							resolve('./build-system/shim/svelte-eslint-parser.js')
						]
					};
				}
			},
			plugins: [
				stringReplace({
					test: /eslint-plugin-svelte3.js/u,
					search: 'Object\\.keys\\(__require\\.cache\\)',
					replace: (original) => `[] /* ${original} */`,
					flags: ''
				}),
				stringReplace({
					test: /eslint-plugin-svelte3.js/u,
					search: '__dirname',
					replace: (original) => `"" /* ${original} */`,
					flags: 'g'
				}),
				stringReplace({
					test: /eslint-plugin-svelte3.js/u,
					search: '^',
					replace: () => `import eslint4bLinter from "eslint4b";\n`,
					flags: ''
				}),
				stringReplace({
					test: /eslint-plugin-svelte3.js/u,
					search: '__require\\(linter_path\\)',
					replace: (original) => `{Linter:eslint4bLinter} // ${original}`,
					flags: ''
				}),
				stringReplace({
					test: /eslint-plugin-svelte3.js/u,
					search: 'throw new Error\\("Could not find ESLint Linter in require cache"\\);',
					replace: (original) => ` // ${original}`,
					flags: ''
				})
			]
		}
	}
};

export default config;
