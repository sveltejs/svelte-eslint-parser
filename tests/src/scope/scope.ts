import assert from "assert";
import { parseForESLint } from "../../../src";
import { getScopeFromNode } from "../../../src/scope";

describe('getScopeFromNode', () => {
	it('returns the global scope for the root node', () => {
		const { ast, scopeManager } = parseForESLint('');

		assert.strictEqual(getScopeFromNode(scopeManager, ast), scopeManager.globalScope);
	});

	it('returns the global scope for the script element', () => {
		const { ast, scopeManager } = parseForESLint('<script></script>');
		const script = ast.body[0];

		assert.strictEqual(getScopeFromNode(scopeManager, script), scopeManager.globalScope);
	});

	it('returns the module scope for nodes for top level nodes of script', () => {
		const { ast, scopeManager } = parseForESLint('<script>import mod from "mod";</script>');
		const importStatement = ast.body[0].body[0];

		assert.strictEqual(getScopeFromNode(scopeManager, importStatement), scopeManager.globalScope.childScopes[0]);
	});

	it('returns the module scope for nested nodes without their own scope', () => {
		const { ast, scopeManager } = parseForESLint('<script>a || b</script>');
		const importStatement = ast.body[0].body[0].expression.right;

		assert.strictEqual(getScopeFromNode(scopeManager, importStatement), scopeManager.globalScope.childScopes[0]);
	});

	it('returns the module scope for nested nodes for non-modules', () => {
		const { ast, scopeManager } = parseForESLint('<script>a || b</script>', { sourceType: 'script' });
		const importStatement = ast.body[0].body[0].expression.right;

		assert.strictEqual(getScopeFromNode(scopeManager, importStatement), scopeManager.globalScope.childScopes[0]);
	});

	it('returns the the child scope of top level nodes with their own scope', () => {
		const { ast, scopeManager } = parseForESLint('<script>function fn() {}</script>');
		const fnNode = ast.body[0].body[0];

		assert.strictEqual(getScopeFromNode(scopeManager, fnNode), scopeManager.globalScope.childScopes[0].childScopes[0]);
	});

	it('returns the own scope for nested nodes', () => {
		const { ast, scopeManager } = parseForESLint('<script>a || (() => {})</script>');
		const importStatement = ast.body[0].body[0].expression.right;

		assert.strictEqual(getScopeFromNode(scopeManager, importStatement), scopeManager.globalScope.childScopes[0].childScopes[0]);
	});

	it('returns the the nearest child scope for statements inside non-global scopes', () => {
		const { ast, scopeManager } = parseForESLint('<script>function fn() { nested; }</script>');
		const fnNode = ast.body[0].body[0];
		const nestedStatement = fnNode.body.body[0];

		assert.strictEqual(getScopeFromNode(scopeManager, nestedStatement), scopeManager.globalScope.childScopes[0].childScopes[0]);
	});
});
