import assert from "assert";
import * as tsParser from "@typescript-eslint/parser";
import { parseForESLint } from "../../../src/index.js";
import { normalizeParserOptions } from "../../../src/parser/parser-options.js";
import { svelteToVirtualTypeScript } from "../../../src/parser/svelte-to-virtual-ts.js";
import { svelteVersion } from "../../../src/parser/svelte-version.js";
import { astToJson } from "./test-utils.js";

const LEAK = "<script>let leaked = 1</script>";
const SCRIPT = "<script>\n  let v = 1;\n</script>";
// A regexp with `{` breaks the brace count, so the scan runs too far.
const OVERRUN = "{(() => { if (v) /[{]/.test(''); return 1; })()}";

/** Check that the real script is the only script block */
function assertScript(result: ReturnType<typeof parseForESLint>) {
  assert.strictEqual(countNodes(result, "SvelteScriptElement"), 1);
  const script = result.ast.body.find(
    (node) => node.type === "SvelteScriptElement",
  );
  assert.strictEqual(script?.body.length, 1);
  assertVariables(result, ["v"]);
}

/** Check that the variables are declared, and nothing leaks */
function assertVariables(
  result: ReturnType<typeof parseForESLint>,
  expected: string[],
) {
  const names = variableNames(result);
  const through = result.scopeManager.globalScope!.through.map(
    (reference) => reference.identifier.name,
  );
  for (const name of expected) {
    assert.ok(names.includes(name), name);
    assert.ok(!through.includes(name), name);
  }
  assert.ok(!names.includes("leaked"));
}

/** Get the names of all variables */
function variableNames(result: ReturnType<typeof parseForESLint>) {
  return result.scopeManager.scopes.flatMap((scope) =>
    scope.variables.map((variable) => variable.name),
  );
}

/** Count the nodes of the given type */
function countNodes(result: ReturnType<typeof parseForESLint>, type: string) {
  return astToJson(result.ast).split(`"type": "${type}"`).length - 1;
}

describe("Script tags inside mustache tags", () => {
  describe("are not blocks", () => {
    const cases: { name: string; template: string; svelte5?: boolean }[] = [
      {
        name: "template literal",
        template: "{@html `<script>(${String(v)})();</script>`}",
      },
      {
        name: "JSON-LD",
        template:
          '{@html `<script type="application/ld+json">${JSON.stringify({ v })}</script>`}',
      },
      { name: "string", template: `{@html '${LEAK}'}` },
      { name: "double quotes", template: `<p>{"}${LEAK}"}</p>` },
      { name: "escaped quote", template: `<p>{'\\'}${LEAK}'}</p>` },
      {
        name: "line continuation with CRLF",
        template: `<p>{'a\\\r\nb}${LEAK}'}</p>`,
      },
      { name: "attribute", template: `<div title={'${LEAK}'}></div>` },
      {
        name: "attribute with text",
        template: `<div title="a {'${LEAK}'} b"></div>`,
      },
      {
        name: "nested template literal",
        template: `{@html \`\${\`\${'}'}\`}${LEAK}\`}`,
      },
      {
        name: "template literal in a template literal",
        template: `{@html \`\${"\`"}${LEAK}\`}`,
      },
      {
        name: "quote and brace in a template literal",
        template: `{@html \`'}${LEAK}\`}`,
      },
      {
        name: "escaped backquote",
        template: `<p>{@html \`\\\`\${'${LEAK}'}\`}</p>`,
      },
      {
        name: "nested braces",
        template: `<p>{[{ a: 1 }, '${LEAK}'].length}</p>`,
      },
      {
        name: "string with a brace in a block tag",
        template: `{#if String(v) === '}' || String(v) === '${LEAK}'}x{/if}`,
      },
      {
        name: "closing block tag",
        template: `<div>{#if v}x{/if}</div> {'${LEAK}'}`,
      },
      {
        name: "line comment",
        template: `<p>{Math.max(v, // } ${LEAK}\n 1)}</p>`,
      },
      {
        name: "line comment ending with CR",
        template: `<p>{Math.max(v, // } ${LEAK}\r 1)}</p>`,
      },
      {
        name: "block comment",
        template: `<p>{v /* } ${LEAK} */}</p>`,
        svelte5: true,
      },
      {
        name: "block comment at the start",
        template: `<p>{/* } ${LEAK} */ v}</p>`,
        svelte5: true,
      },
    ];
    for (const { name, template, svelte5 } of cases) {
      // Svelte 3 and 4 do not support these comments in the template.
      const skip = svelte5 && !svelteVersion.gte(5);
      (skip ? it.skip : it)(name, () => {
        // Stray `}` and `-->` come after the script.
        const code = `<div></div>\n${template}\n${SCRIPT}\n<p>}}}</p>\n<!-- } -->\n`;
        assertScript(parseForESLint(code, {}));
      });
    }

    it("template literal with TypeScript", () => {
      const code = `<script lang="ts">\n  let v: number = 1;\n</script>\n{@html \`<script>(\${String(v)})();</script>\`}\n`;
      const result = parseForESLint(code, { parser: tsParser });
      assert.strictEqual(countNodes(result, "SvelteScriptElement"), 1);
    });

    it("style in a string", () => {
      const code = `${SCRIPT}\n{@html '<style>p { color: red; }</style>'}\n`;
      const result = parseForESLint(code, {});
      assertScript(result);
      assert.strictEqual(countNodes(result, "SvelteStyleElement"), 0);
    });
  });

  // When a regexp confuses the scan, the result is the same as before.
  describe("are parsed as before when the scan is confused", () => {
    // An unclosed mustache tag turns off skipping in the whole file.
    it("gives up at a quote in a regexp, and leaks a script before it", () => {
      const code = `${SCRIPT}\n<p>{@html '${LEAK}'}</p>\n<p>{String(v).match(/'/)}</p>\n`;
      const names = variableNames(parseForESLint(code, {}));
      assert.ok(names.includes("leaked"));
      assert.ok(names.includes("v"));
    });

    it("gives up at a quote in a regexp, and throws", () => {
      const code = `<script>let v = /}/;</script>\n<!-- c -->\n<div title={'<script>'}></div>\n{0 || /'/.test(v)}\n{'<script>let leak=1</script>'}\n{a.replace(/}/g, '')}\n`;
      assert.throws(() => parseForESLint(code, {}));
    });

    it("gives up at the end of the file", () => {
      const code = `<div></div>\n${SCRIPT}\n<p>${OVERRUN}</p>\n`;
      assertScript(parseForESLint(code, {}));
    });

    it("hidden script", () => {
      const code = `<div></div>\n<br />${OVERRUN}<br />\n${SCRIPT}<br />\n<p>}}}</p>\n`;
      assertScript(parseForESLint(code, {}));
    });

    it("hidden script after a regexp in an attribute", () => {
      const code = `<div></div>\n<input title={/\\{/.source} />\n${SCRIPT}<br />\n<p>}}</p>\n`;
      assertScript(parseForESLint(code, {}));
    });

    it("hidden script after `{@html}`", () => {
      const code = `<div></div>\n<br />{@html (() => { if (v) {} /\\{x/.test(String(v)); return "<b>" })()}<br />\n${SCRIPT}<br />\n<p>}}</p>\n`;
      assertScript(parseForESLint(code, {}));
    });

    describe("hidden top-level block with `}`", () => {
      // The scan ends at a `}` in the block, with no template node before it.
      const cases: { name: string; code: string; variables: string[] }[] = [
        {
          name: "script after an attribute",
          code: "<div title={a.replace(/\\{/g, '')}></div><script>\n  let a = 1; const r = /}/;\n</script>\n<p>{a}</p>\n",
          variables: ["a", "r"],
        },
        {
          name: "script with a string",
          code: "<p>{v.match(/'/)}</p><script>let v = '}';</script>\n",
          variables: ["v"],
        },
        {
          name: "script after an element",
          code: "<p>{0 || /\\{/.test(v)}</p><script>\n  let v = 1;\n  const re = /\\}/;\n</script>\n",
          variables: ["v", "re"],
        },
        {
          name: "script after text",
          code: "<h1>Hi</h1>\n{0 || /\\{/.test(v)}<script>\n  let v = 1;\n  const re = /}/;\n</script>\n",
          variables: ["v", "re"],
        },
        {
          name: "module script",
          code: '<p>{0 || /\\{/.test(v)}</p><script context="module">export const re = /}/;</script>\n<script>let v = 1;</script>\n',
          variables: ["v", "re"],
        },
        {
          name: "options",
          code: "<p>{0 || /\\{/.test(v)}</p><script>let v = 1;</script><svelte:options customElement={{tag: 'my-el', extend: (c) => class extends c { static re = /}/ }}} />\n",
          variables: ["v"],
        },
      ];
      for (const { name, code, variables } of cases) {
        it(name, () => {
          assertVariables(parseForESLint(code, {}), variables);
        });
      }

      it("style after an element", () => {
        const code = `<p>{0 || /\\{/.test(v)}</p><style>\n  p::after { content: "}"; }\n</style>\n${SCRIPT}\n`;
        const result = parseForESLint(code, {});
        assertScript(result);
        assert.strictEqual(countNodes(result, "SvelteStyleElement"), 1);
      });

      it("style after an attribute", () => {
        const code = `${SCRIPT}\n<div title={String(v).replace(/\\{/g, '')}></div><style>p { color: red; }</style>\n`;
        const result = parseForESLint(code, {});
        assertScript(result);
        assert.strictEqual(countNodes(result, "SvelteStyleElement"), 1);
      });
    });

    it("hidden comment", () => {
      const code = `<div></div>\n<br />${OVERRUN}<br />\n<!-- } ${LEAK} -->\n${SCRIPT}\n`;
      assertScript(parseForESLint(code, {}));
    });

    describe("`<!--` in a mustache tag", () => {
      // As before, `<!--` starts a comment that hides the script up to `-->`.
      const cases = [
        '<div a={"<!--"} c="\n<script>let x = 1;</script>-->"></div>\n',
        '<textarea>{"<!--"}\n<script>let x = 1;</script>\n--></textarea>\n',
        '<div>x<style>\na{ content: "<!--" }\n<script>let x = 1;</script> -->\n</style></div>\n',
        '<div a={f(/`/)} b="<!--`}" c="\n<script>let x = 1;</script>-->"></div>\n',
      ];
      for (const code of cases) {
        it(code, () => {
          const result = parseForESLint(code, {});
          assert.strictEqual(countNodes(result, "SvelteScriptElement"), 0);
          assert.ok(!variableNames(result).includes("x"));
        });
      }
    });

    it("comment that ends in a mustache tag", () => {
      // The comment ends at the first `-->`, for the compiler too.
      const code = `<div></div>\n<!-- {"-->"}\n${SCRIPT}\n`;
      assertScript(parseForESLint(code, {}));
    });

    it("hidden style that the compiler cannot parse", () => {
      const code = `<div></div>\n${SCRIPT}\n<br />${OVERRUN}<br />\n<style lang="scss">\n  $c: red;\n  p { color: $c; }\n</style><br />\n<p>}}}</p>\n`;
      const result = parseForESLint(code, {});
      assertScript(result);
      assert.strictEqual(countNodes(result, "SvelteStyleElement"), 1);
    });

    it("hidden style in `<svelte:head>`", () => {
      const code = `${SCRIPT}\n<svelte:head>\n  <br />${OVERRUN}<br />\n  <style>p { color: red; }</style><br />\n</svelte:head>\n<p>}}}</p>\n`;
      const result = parseForESLint(code, {});
      assertScript(result);
      const head = result.ast.body.find(
        (node) => node.type === "SvelteElement" && node.kind === "special",
      );
      assert.ok(
        head?.type === "SvelteElement" &&
          head.children.some(
            (child) =>
              child.type === "SvelteElement" &&
              child.name.type === "SvelteName" &&
              child.name.name === "style",
          ),
      );
    });

    describe("hidden pug template", () => {
      // The scan runs from `{/\{/` to the `}` after the pug template.
      const hidden =
        '<input title={/\\{/.source} />\n<template lang="pug">p #{n}</template><br/>}';
      const wrappers: { name: string; wrap: string }[] = [
        { name: "element", wrap: "<div>X</div>" },
        { name: "if block", wrap: "{#if true}X{/if}" },
        { name: "else block", wrap: "{#if true}a{:else}X{/if}" },
        { name: "each block", wrap: "{#each [1] as m}X{/each}" },
        { name: "each else block", wrap: "{#each [1] as m}a{:else}X{/each}" },
        { name: "await block", wrap: "{#await p}X{/await}" },
        { name: "then block", wrap: "{#await p}a{:then r}X{/await}" },
        { name: "catch block", wrap: "{#await p}a{:catch e}X{/await}" },
      ];
      for (const { name, wrap } of wrappers) {
        it(name, () => {
          const code = `<script>\n  let n = 0;\n  const p = Promise.resolve();\n</script>\n${wrap.replace("X", hidden)}\n`;
          const result = parseForESLint(code, {});
          // The pug template is blanked, so `{n}` in it is not a mustache tag.
          assert.strictEqual(countNodes(result, "SvelteMustacheTag"), 1);
          const n =
            result.scopeManager.globalScope!.childScopes[0].set.get("n")!;
          for (const reference of n.references) assert.ok(!reference.isRead());
        });
      }
    });

    describe("virtual TypeScript", () => {
      /** Translate the code to the virtual TypeScript */
      function toVirtual(code: string) {
        const filePath = "Component.svelte";
        return svelteToVirtualTypeScript(
          filePath,
          code,
          normalizeParserOptions({
            filePath,
            parser: { ts: "@typescript-eslint/parser" },
            ecmaVersion: 2024,
            sourceType: "module",
          }),
        );
      }

      it("hidden TypeScript script", () => {
        const code =
          '<input title={/\\{/.source} />\n<script lang="ts">let n: number = 0;</script><br/>\n<p>}}</p>\n';
        assert.match(toVirtual(code) ?? "", /let n: number = 0/u);
      });

      it("JavaScript script", () => {
        const code = `<script>let n = 0;</script>\n{@html '${LEAK}'}\n`;
        assert.strictEqual(toVirtual(code), null);
      });
    });
  });

  it("keeps a self-closing script", () => {
    const code = `<script lang="ts" src="./a.ts" />\n<div></div>\n{'${LEAK}'}\n`;
    const result = parseForESLint(code, {});
    assert.strictEqual(countNodes(result, "SvelteScriptElement"), 0);
    const [script] = result.ast.body;
    assert.strictEqual(script.type, "SvelteElement");
    assert.strictEqual(script.range[1], 33);
  });

  it("keeps a pug template", () => {
    const code = `<template lang="pug">\n  p {v}\n</template>\n<div></div>\n{'${LEAK}'}\n${SCRIPT}\n`;
    assertScript(parseForESLint(code, {}));
  });

  it("stays linear for unclosed mustache tags", () => {
    const start = performance.now();
    assert.throws(() => parseForESLint("<p>{a</p>\n".repeat(16000), {}));
    // A quadratic scan would take seconds.
    assert.ok(performance.now() - start < 1000);
  });
});
