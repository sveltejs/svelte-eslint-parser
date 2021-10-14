import staticAdapter from '@sveltejs/adapter-static';
import { resolve } from 'path';
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
					path: resolve('./build-system/shim/path.js'),
					fs: resolve('./build-system/shim/fs.js'),
					module: resolve('./build-system/shim/module.js'),
					eslint: resolve('./build-system/shim/eslint.js'),
					'svelte-eslint-parser': resolve('./build-system/shim/svelte-eslint-parser.js'),
					'eslint-plugin-svelte3': resolve('./build-system/shim/eslint-plugin-svelte3.js')
				}
			}
		}
	}
};

export default config;
