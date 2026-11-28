import staticAdapter from '@sveltejs/adapter-static';
import { sveltekit } from '@sveltejs/kit/vite';
import { resolve } from 'path';
import eslint4b, { requireESLintUseAtYourOwnRisk4b } from 'vite-plugin-eslint4b';

/** @type {import('vite').UserConfig} */
const config = {
	plugins: [
		sveltekit({
			paths: {
				base: '/svelte-eslint-parser',
				relative: false
			},

			adapter: staticAdapter({
				// default options are shown
				pages: 'build',
				assets: 'build',
				fallback: null
			}),

			compilerOptions: {
				// Force Svelte 5 runes mode. Svelte 4 syntax is a compile error.
				runes: true
			}
		}),
		eslint4b(),
		requireESLintUseAtYourOwnRisk4b()
	],
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
	}
};

export default config;
