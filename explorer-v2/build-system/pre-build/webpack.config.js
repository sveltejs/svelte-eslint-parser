import { resolve } from 'path';
import WrapperPlugin from 'wrapper-webpack-plugin';

const output = {
	path: resolve('../shim'),
	filename: '[name].js',
	library: {
		type: 'module'
	},
	hashFunction: 'xxhash64'
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
			'svelte-eslint-parser': resolve('./svelte-eslint-parser.js')
		},
		externals: {
			'svelte/compiler': '$$inject_svelte_compiler$$',
			espree: '$$inject_espree$$'
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
		externals: {
			'node:process': '$$inject_process$$'
		},
		entry: {
			'svelte/compiler': resolve('../../node_modules/svelte/src/compiler/index.js')
		},
		plugins: [
			new WrapperPlugin({
				test: /svelte\/compiler\.js/,
				header: `
				const $$inject_process$$ = undefined;
				`
			})
		]
	}
];
