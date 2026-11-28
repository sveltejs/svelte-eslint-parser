import { describe, it } from "node:test";
import assert from "assert";
import { parseForESLint } from "../../../src/index.js";
import { traverseNodes } from "../../../src/traverse.js";
import type { SvelteConstTag } from "../../../src/ast/index.js";

describe("SvelteConstTag", () => {
  it("has `declarations` and no `declaration`", () => {
    const result = parseForESLint(
      "{#each items as item}{@const double = item * 2}{double}{/each}",
    );
    const constTags: SvelteConstTag[] = [];
    traverseNodes(result.ast, {
      visitorKeys: result.visitorKeys,
      enterNode(node) {
        if (node.type === "SvelteConstTag") constTags.push(node);
      },
      leaveNode() {
        // noop
      },
    });
    assert.strictEqual(constTags.length, 1);
    const [constTag] = constTags;
    assert.strictEqual(constTag.declarations.length, 1);
    assert.strictEqual(constTag.declarations[0].type, "VariableDeclarator");
    assert.ok(!("declaration" in constTag));
  });
});
