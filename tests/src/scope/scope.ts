import assert from "assert";
import * as svelte from "../../../src";
import { FlatESLint } from 'eslint/use-at-your-own-risk';

async function generateScopeTestCase(code, selector, type) {
	const eslint = new FlatESLint({
		overrideConfigFile: true,
		overrideConfig: {
			languageOptions: {
				parser: svelte,
			},
			plugins: {
				local: {
					rules: {
						rule: generateScopeRule(selector, type),
					}
				}
			},
			rules: {
				'local/rule': 'error',
			}
		}
	});
	await eslint.lintText(code);
}

function generateScopeRule(selector, type) {
	return {
		create(context) {
			return {
				[selector]() {
					const scope = context.getScope();
	
					assert.strictEqual(scope.type, type);
				}	
			};
		}
	}
}

describe('context.getScope', () => {
	it('returns the global scope for the root node', async () => {
		await generateScopeTestCase('', 'Program', 'global');
	});

	it('returns the global scope for the script element', async () => {
		await generateScopeTestCase('<script></script>', 'SvelteScriptElement', 'global');
	});

	it.only('returns the module scope for nodes for top level nodes of script', async () => {
		await generateScopeTestCase('<script>import mod from "mod";</script>', 'ImportDeclaration', 'module');
	});

	it('returns the module scope for nested nodes without their own scope', async () => {
		await generateScopeTestCase('<script>a || b</script>', 'LogicalExpression', 'module');
	});

	it('returns the the child scope of top level nodes with their own scope', async () => {
		await generateScopeTestCase('<script>function fn() {}</script>', 'FunctionDeclaration', 'function');
	});

	it('returns the own scope for nested nodes', async () => {
		await generateScopeTestCase('<script>a || (() => {})</script>', 'ArrowFunctionExpression', 'function');
	});

	it('returns the the nearest child scope for statements inside non-global scopes', async () => {
		await generateScopeTestCase('<script>function fn() { nested; }</script>', 'ExpressionStatement', 'function');
	});
});
