import { resolve } from 'path';
import WrapperPlugin from 'wrapper-webpack-plugin';

const output = {
	path: resolve('../shim'),
	filename: '[name].js',
	library: {
		type: 'module'
	}
};
const alias = {
	assert: resolve('./shim-assert.cjs'),
	fs: resolve('../shim/fs.js'),
	path: resolve('../shim/path.js'),
	module: resolve('../shim/module.js'),
	url: resolve('../shim/url.js'),
	util: resolve('../shim/util.js'),
	typescript: resolve('../shim/typescript.js')
};
/** @type {import('webpack').Configuration} */
const base = {
	output,
	resolve: {
		alias
	},
	target: ['web'],
	optimization: {
		minimize: false
	},
	mode: 'production',
	experiments: {
		outputModule: true
	},
	externalsType: 'var'
};
/** @type {import('webpack').Configuration[]} */
export default [
	{
		...base,
		entry: {
			eslint: resolve('./eslint.js')
		},
		externals: {
			espree: '$$inject_espree$$',
			esquery: '$$inject_esquery$$'
		},
		plugins: [
			new WrapperPlugin({
				test: /eslint\.js/,
				header: `
				if (typeof window !== "undefined") {
					if (typeof window.global === "undefined") {
						window.global = {}
					}
					if (typeof window.process === "undefined") {
						window.process = {
							env: {},
							cwd: () => undefined,
						}
					}
				}
				import * as $$inject_espree$$ from 'espree';
				import $$inject_esquery$$ from 'esquery';
				`
			})
		]
	},
	{
		...base,
		entry: {
			'svelte-eslint-parser': resolve('./svelte-eslint-parser.js')
		},
		externals: {
			'svelte/compiler': '$$inject_svelte_compiler$$',
			espree: '$$inject_espree$$'
		},
		module: {
			rules: [
				{
					test: /\/resolve-parser\.js$/u,
					loader: 'string-replace-loader',
					options: {
						search: 'require\\(parserValue\\)',
						replace: `__non_webpack_require__(parserValue)`,
						flags: ''
					}
				}
			]
		},
		plugins: [
			new WrapperPlugin({
				test: /svelte-eslint-parser\.js/,
				header: `
				import * as $$inject_svelte_compiler$$ from 'svelte/compiler';
				import * as $$inject_espree$$ from 'espree';
				`
			})
		]
	},
	{
		...base,
		entry: {
			'eslint-plugin-svelte3': resolve('./eslint-plugin-svelte3.js')
		},
		module: {
			rules: [
				{
					test: /node_modules\/eslint-plugin-svelte3\/index\.js$/u,
					loader: 'string-replace-loader',
					options: {
						search: 'Object\\.keys\\(__require\\.cache\\)',
						replace: (original) => `[] /* ${original} */`,
						flags: ''
					}
				},
				{
					test: /node_modules\/eslint-plugin-svelte3\/index\.js$/u,
					loader: 'string-replace-loader',
					options: {
						search: 'require\\(linter_path\\)',
						replace: (original) => `require('eslint'); // ${original}`,
						flags: ''
					}
				},
				{
					test: /node_modules\/eslint-plugin-svelte3\/index\.js$/u,
					loader: 'string-replace-loader',
					options: {
						search: "throw new Error\\('Could not find ESLint Linter in require cache'\\);",
						replace: (original) => ` // ${original}`,
						flags: ''
					}
				}
			]
		},
		externals: {
			'svelte/compiler': '$$inject_svelte_compiler$$',
			eslint: '$$inject_eslint$$'
		},
		plugins: [
			new WrapperPlugin({
				test: /eslint-plugin-svelte3\.js/,
				header: `
				import * as $$inject_svelte_compiler$$ from 'svelte/compiler';
				import * as $$inject_eslint$$ from 'eslint';
				`
			})
		]
	}
];
