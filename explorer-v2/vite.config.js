import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'path';
import { createRequire } from 'module';
import eslint4b, { requireESLintUseAtYourOwnRisk4b } from 'vite-plugin-eslint4b';

const { version: MONACO_EDITOR_VERSION } = createRequire(import.meta.url)(
	'monaco-editor/package.json'
);

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [sveltekit(), eslint4b(), requireESLintUseAtYourOwnRisk4b()],
	server: {
		fs: { strict: false }
	},
	resolve: {
		alias: {
			assert: resolve('./build-system/shim/assert.js'),
			path: resolve('./build-system/shim/path.js'),
			'node:path': resolve('./build-system/shim/path.js'),
			util: resolve('./build-system/shim/util.js'),
			fs: resolve('./build-system/shim/fs.js'),
			module: resolve('./build-system/shim/module.js'),
			'node:module': resolve('./build-system/shim/module.js'),

			globby: resolve('./build-system/shim/globby.js'),
			'fast-glob': resolve('./build-system/shim/fast-glob.js'),
			tslib: resolve('./node_modules/tslib/tslib.es6.js')
		}
	},
	define: {
		MONACO_EDITOR_VERSION: JSON.stringify(MONACO_EDITOR_VERSION)
	}
};

export default config;
