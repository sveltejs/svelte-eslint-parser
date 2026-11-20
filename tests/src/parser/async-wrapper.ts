import assert from "assert";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import type { TSESTree } from "@typescript-eslint/types";
import { parseForESLint } from "../../../src/index.js";
import { traverseNodes } from "../../../src/traverse.js";
import { svelteVersion } from "../../../src/parser/svelte-version.js";
import { generateParserOptions } from "./test-utils.js";

const dirname = path.dirname(fileURLToPath(import.meta.url));

const blocks: Record<string, string> = {
  each: "{#each xs as x}{x}{/each}",
  "each with index and key": "{#each xs as x, i (x)}{x}{i}{/each}",
  "await then": "{#await p then v}{v}{/await}",
  "await catch": "{#await p}a{:catch e}{e}{/await}",
  "let directive": "<div let:x>{x}</div>",
  ...(svelteVersion.gte(5)
    ? {
        // `{#each}` without `as` and snippets need Svelte 5.
        "each without context": "{#each xs}a{/each}",
        snippet: "{#snippet s(a)}{a}{/snippet}{@render s(1)}",
      }
    : {}),
};

describe("Wrappers of template blocks in the virtual script", () => {
  // Async functions exist since ES2017. Older versions must not get `async`.
  for (const ecmaVersion of [6, 7, 2015, 2016, 8, 2017, undefined]) {
    for (const [name, template] of Object.entries(blocks)) {
      it(`parses ${name} with ecmaVersion ${ecmaVersion}`, () => {
        const code = `<script>let xs = [1]; let p = Promise.resolve(1);</script>\n${template}`;
        assert.doesNotThrow(() =>
          parseForESLint(code, { ecmaVersion } as never),
        );
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
          const tsNode = result.services.esTreeNodeToTSNodeMap!.get(
            node.id as TSESTree.Identifier,
          );
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
