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
		'node/no-missing-import': 'off',
		'node/no-unpublished-require': 'off',
		'node/no-unpublished-import': 'off',
		'node/no-unsupported-features/es-syntax': 'off',
		'require-jsdoc': 'off',
		'node/file-extension-in-import': 'off',
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
