module.exports = {
	root: true,
	extends: [
		'plugin:@ota-meshi/recommended',
		'plugin:@ota-meshi/+node',
		'plugin:@ota-meshi/+json',
		'plugin:@ota-meshi/+prettier',
		'plugin:svelte/recommended'
	],
	parserOptions: {
		sourceType: 'module',
		ecmaVersion: 2020
	},
	env: {
		browser: true,
		es2017: true,
		node: true
	},
	rules: {
		'eslint-comments/no-unused-disable': 'off',
		'n/no-missing-import': 'off',
		'n/no-unpublished-require': 'off',
		'n/no-unpublished-import': 'off',
		'n/no-unsupported-features/es-syntax': 'off',
		'n/no-unsupported-features/node-builtins': 'off',
		'require-jsdoc': 'off',
		'n/file-extension-in-import': 'off',
		'prettier/prettier': [
			'error',
			{},
			{
				usePrettierrc: true
			}
		],
		'no-shadow': 'off',
		camelcase: 'off'
	},
	overrides: [
		{
			files: ['*.d.ts'],
			rules: {
				'spaced-comment': 'off'
			}
		}
	]
};
