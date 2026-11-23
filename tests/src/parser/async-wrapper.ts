import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { parseForESLint } from "../../../src/index.js";
import { traverseNodes } from "../../../src/traverse.js";
import { svelteVersion } from "../../../src/parser/svelte-version.js";
import { generateParserOptions } from "./test-utils.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

// Each block form puts `body` in a wrapper function of the virtual script.
const blocks: Record<string, (body: string) => string> = {
  each: (body) => `{#each xs as x}{x}${body}{/each}`,
  "each with index and key": (body) =>
    `{#each xs as x, i (x)}{x}{i}${body}{/each}`,
  "await then": (body) => `{#await p then v}{v}${body}{/await}`,
  "await catch": (body) => `{#await p}a{:catch e}{e}${body}{/await}`,
  "let directive": (body) => `<div let:x>{x}${body}</div>`,
  ...(svelteVersion.gte(5)
    ? {
        // `{#each}` without `as` and snippets need Svelte 5.
        "each without context": (body: string) => `{#each xs}a${body}{/each}`,
        snippet: (body: string) =>
          `{#snippet s(a)}{a}${body}{/snippet}{@render s(1)}`,
      }
    : {}),
};

/** Parse the template with the given parser options. */
function parseTemplate(template: string, options: object) {
  const code = `<script>let xs = [1]; let p = Promise.resolve(1);</script>\n${template}`;
  return parseForESLint(code, options);
}

describe("Wrappers of template blocks in the virtual script", () => {
  // Async functions exist since ES2017. Older versions must not get `async`.
  for (const ecmaVersion of [3, 5, 6, 7, 2015, 2016]) {
    for (const [name, block] of Object.entries(blocks)) {
      it(`parses ${name} with ecmaVersion ${ecmaVersion}`, () => {
        assert.doesNotThrow(() => parseTemplate(block(""), { ecmaVersion }));
      });
    }
  }

  // From ES2017, the wrappers are async, so `await` can be used inside them.
  const asyncOptions: Record<string, object> = {
    "ecmaVersion 8": { ecmaVersion: 8 },
    "ecmaVersion 2017": { ecmaVersion: 2017 },
    'ecmaVersion "latest"': { ecmaVersion: "latest" },
    "the default ecmaVersion": {},
  };
  for (const [optionsName, options] of Object.entries(asyncOptions)) {
    for (const [name, block] of Object.entries(blocks)) {
      it(`parses \`await\` in ${name} with ${optionsName}`, () => {
        assert.doesNotThrow(() => parseTemplate(block("{await p}"), options));
      });
    }
  }

  if (svelteVersion.gte(5)) {
    it("does not make a TypeScript snippet return a Promise", () => {
      const filePath = path.join(
        dirname,
        "../../fixtures/parser/ast/svelte5/async/await-in-blocks-ts-input.svelte",
      );
      const result = parseForESLint(
        fs.readFileSync(filePath, "utf8"),
        generateParserOptions({ filePath }),
      );
      const checker = result.services.program!.getTypeChecker();
      const types: string[] = [];
      traverseNodes(result.ast, {
        visitorKeys: result.visitorKeys,
        enterNode(node) {
          if (node.type !== "SvelteSnippetBlock") return;
          const tsNode = result.services.esTreeNodeToTSNodeMap!.get(node.id);
          const [signature] = checker
            .getTypeAtLocation(tsNode)
            .getCallSignatures();
          types.push(checker.typeToString(signature.getReturnType()));
        },
        leaveNode() {
          // Nothing to restore.
        },
      });
      assert.strictEqual(types.length, 1);
      assert.ok(types[0].includes("{@render ...}"), types[0]);
      assert.ok(!types[0].startsWith("Promise<"), types[0]);
    });
  }
});
