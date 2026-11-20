import { Linter } from "eslint";
import assert from "assert";
import * as parser from "../../../src/index.js";
import type * as eslint from "eslint";
import { svelteVersion } from "../../../src/parser/svelte-version.js";

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

/** Find `name` from `getScope()` of each mustache identifier and return the definition types. */
function getDefTypesFromScope(code: string, name: string): string[] {
  const linter = new Linter();
  const result: string[] = [];
  linter.verify(code, {
    plugins: {
      test: {
        rules: {
          test: {
            create(context) {
              return {
                [`SvelteMustacheTag > Identifier[name="${name}"]`](node: any) {
                  let scope: eslint.Scope.Scope | null = (
                    context.sourceCode as any
                  ).getScope(node);
                  for (; scope; scope = scope.upper) {
                    const variable = scope.set.get(name);
                    if (variable) {
                      result.push(variable.defs[0].type);
                      return;
                    }
                  }
                  result.push("none");
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
  return result;
}

describe("context.getScope with component `let:` directives", () => {
  const script = "<script>import C from './C.svelte'; let x = 1;</script>";

  it("finds the `let:` name in the default slot", () => {
    assert.deepStrictEqual(
      getDefTypesFromScope(`${script}<C let:x><p>{x}</p>{x}</C>`, "x"),
      ["Parameter", "Parameter"],
    );
  });

  it("does not find the `let:` name in a named slot", () => {
    assert.deepStrictEqual(
      getDefTypesFromScope(
        `${script}<C let:x><p slot="a">{x}</p><div slot="b"><span>{x}</span></div></C>`,
        "x",
      ),
      ["Variable", "Variable"],
    );
  });

  it("does not find the `let:` name in a named slot of `<svelte:fragment>` or a component", () => {
    assert.deepStrictEqual(
      getDefTypesFromScope(
        `${script}<C let:x><svelte:fragment slot="a">{x}</svelte:fragment><C slot="b">{x}</C></C>`,
        "x",
      ),
      ["Variable", "Variable"],
    );
  });

  (svelteVersion.gte(5) ? it : it.skip)(
    "finds the `let:` name in the default slot next to a snippet",
    () => {
      assert.deepStrictEqual(
        getDefTypesFromScope(
          `${script}<C let:x>{#snippet s()}{x}{/snippet}<p>{x}</p><p slot="a">{x}</p></C>`,
          "x",
        ),
        ["Variable", "Parameter", "Variable"],
      );
    },
  );
});
