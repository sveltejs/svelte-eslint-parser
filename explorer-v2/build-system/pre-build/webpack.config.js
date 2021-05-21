import { resolve } from 'path';

/** @type {import('webpack').Configuration[]} */
export default [
	{
		entry: {
			'eslint-scope': resolve('./eslint-scope.js')
		},
		output: {
			path: resolve('../shim'),
			filename: '[name].js',
			library: {
				type: 'module'
			}
		},
		resolve: {
			alias: {
				assert: resolve('./shim-assert.cjs'),
				fs: resolve('../shim/fs.js'),
				path: resolve('../shim/path.js'),
				module: resolve('../shim/module.js'),
				url: resolve('../shim/url.js')
			}
		},
		target: ['web'],
		optimization: {
			minimize: false
		},
		mode: 'production',
		experiments: {
			outputModule: true
		}
	},
	{
		entry: {
			'svelte-eslint-parser': resolve('./svelte-eslint-parser.js')
		},
		output: {
			path: resolve('../shim'),
			filename: '[name].js',
			library: {
				type: 'module'
			}
		},
		resolve: {
			alias: {
				assert: resolve('./shim-assert.cjs'),
				fs: resolve('../shim/fs.js'),
				path: resolve('../shim/path.js'),
				module: resolve('../shim/module.js'),
				url: resolve('../shim/url.js')
			}
		},
		target: ['web'],
		externals: {
			// "eslint-scope": "eslint-scope",
			svelte: 'svelte'
			// lodash: 'lodash'
		},
		externalsType: 'module',
		optimization: {
			minimize: false
		},
		mode: 'production',
		experiments: {
			outputModule: true
		}
	}
];
