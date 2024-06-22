import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'path';
import { createRequire } from 'module';

const { version: MONACO_EDITOR_VERSION } = createRequire(import.meta.url)(
	'monaco-editor/package.json'
);

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit()],
	server: {
		fs: { strict: false }
	},
	resolve: {
		alias: {
			assert: resolve('./build-system/shim/assert.js'),
			path: resolve('./build-system/shim/path.js'),
			fs: resolve('./build-system/shim/fs.js'),
			module: resolve('./build-system/shim/module.js'),

			globby: resolve('./build-system/shim/globby.js'),
			tslib: resolve('./node_modules/tslib/tslib.es6.js'),
			eslint: resolve('./build-system/shim/eslint.js'),
			'svelte-eslint-parser': resolve('./build-system/shim/svelte-eslint-parser.js'),
			'svelte/compiler': resolve('./build-system/shim/svelte/compiler.js')
		}
	},
	define: {
		MONACO_EDITOR_VERSION: JSON.stringify(MONACO_EDITOR_VERSION)
	}
};

export default config;
