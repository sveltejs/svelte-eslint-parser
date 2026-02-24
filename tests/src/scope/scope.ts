import { Linter } from "eslint";
import assert from "assert";
import * as parser from "../../../src/index.js";
import type * as eslint from "eslint";

function generateScopeTestCase(code: string, selector: string, type: string) {
  const linter = new Linter();
  let scope: eslint.Scope.Scope;
  linter.verify(code, {
    plugins: {
      test: {
        rules: {
          test: {
            create(context) {
              return {
                [selector](node: any) {
                  scope = (context.sourceCode as any).getScope(node);
                },
              };
            },
          },
        },
      },
    },
    languageOptions: {
      parser,
      parserOptions: { ecmaVersion: 2020, sourceType: "module" },
    },
    rules: {
      "test/test": "error",
    },
  });
  assert.strictEqual(scope!.type, type);
}

describe("context.getScope", () => {
  it("returns the global scope for the root node", () => {
    generateScopeTestCase("", "Program", "global");
  });

  it("returns the global scope for the script element", () => {
    generateScopeTestCase("<script></script>", "SvelteScriptElement", "module");
  });

  it("returns the module scope for nodes for top level nodes of script", () => {
    generateScopeTestCase(
      '<script>import mod from "mod";</script>',
      "ImportDeclaration",
      "module",
    );
  });

  it("returns the module scope for nested nodes without their own scope", () => {
    generateScopeTestCase(
      "<script>a || b</script>",
      "LogicalExpression",
      "module",
    );
  });

  it("returns the the child scope of top level nodes with their own scope", () => {
    generateScopeTestCase(
      "<script>function fn() {}</script>",
      "FunctionDeclaration",
      "function",
    );
  });

  it("returns the own scope for nested nodes", () => {
    generateScopeTestCase(
      "<script>a || (() => {})</script>",
      "ArrowFunctionExpression",
      "function",
    );
  });

  it("returns the the nearest child scope for statements inside non-global scopes", () => {
    generateScopeTestCase(
      "<script>function fn() { nested; }</script>",
      "ExpressionStatement",
      "function",
    );
  });
});
