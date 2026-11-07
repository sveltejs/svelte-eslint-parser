import assert from "assert";
import type { TSESTree } from "@typescript-eslint/types";
import { parseForESLint } from "../../../../src/index.js";
import * as tsParser from "@typescript-eslint/parser";
import { traverseNodes } from "../../../../src/traverse.js";
import { svelteVersion } from "../../../../src/parser/svelte-version.js";

// typescript-eslint returns separate node copies from deprecated getters
// (e.g. `TSEnumDeclaration.members`). They are not in the visitor keys,
// but their locations must still point to the original source.
const CASES: Record<string, string> = {
  "store access in <script>": `<script lang="ts">
  enum A { a }
  type M = { [K in keyof T]: T[K] };
  type I = import("a");
  $a;
</script>`,
  "runes in <script>": `<script lang="ts">
  let { p } = $props();
  enum A { a }
  type M = { [K in keyof T]: T[K] };
  type I = import("a");
</script>`,
  "template expression": `<script lang="ts">
  let { p } = $props();
</script>
{@const v = p as { [K in keyof T]: T[K] } | import("a")}`,
};
if (!svelteVersion.gte(5)) {
  // TypeScript in template expressions needs Svelte 5.
  delete CASES["template expression"];
}

type Check = { name: string; node: any; alias: string; expected: string };

/** Collect deprecated aliases and the source text they should cover */
function collectChecks(ast: any, code: string): Check[] {
  const checks: Check[] = [];
  traverseNodes(ast, {
    enterNode(node: any) {
      const n = node as TSESTree.Node;
      if (n.type === "TSEnumDeclaration") {
        checks.push({
          name: "TSEnumDeclaration.members[0]",
          node: n,
          alias: "members",
          expected: code.slice(...n.body.members[0].range),
        });
      } else if (n.type === "TSMappedType") {
        checks.push({
          name: "TSMappedType.typeParameter",
          node: n,
          alias: "typeParameter",
          expected: code.slice(n.key.range[0], n.constraint.range[1]),
        });
      } else if (n.type === "TSImportType") {
        checks.push({
          name: "TSImportType.argument",
          node: n,
          alias: "argument",
          expected: code.slice(...n.source.range),
        });
      }
    },
    leaveNode() {
      /* noop */
    },
  });
  return checks;
}

describe("Locations of deprecated typescript-eslint aliases", () => {
  for (const [title, code] of Object.entries(CASES)) {
    it(title, () => {
      const result = parseForESLint(code, {
        filePath: "test.svelte",
        parser: tsParser,
        suppressDeprecatedPropertyWarnings: true,
      });
      const checks = collectChecks(result.ast, code);
      assert.ok(checks.length > 0);
      for (const check of checks) {
        const value = check.node[check.alias];
        const target = Array.isArray(value) ? value[0] : value;
        assert.strictEqual(
          code.slice(...target.range),
          check.expected,
          `${check.name} range`,
        );
        const lines = code.split("\n");
        assert.strictEqual(
          lines[target.loc.start.line - 1].slice(target.loc.start.column),
          code.slice(target.range[0]).split("\n")[0],
          `${check.name} loc`,
        );
      }
    });
  }

  it("does not read the aliases while parsing", async () => {
    const warnings: string[] = [];

    /** Collect warnings */
    function onWarning(w: Error) {
      warnings.push(w.message);
    }

    process.on("warning", onWarning);
    try {
      const code = CASES["store access in <script>"];
      const result = parseForESLint(code, {
        filePath: "test.svelte",
        parser: tsParser,
        suppressDeprecatedPropertyWarnings: false,
      });
      // `process.emitWarning` emits the event on the next tick.
      await new Promise((resolve) => setImmediate(resolve));
      assert.deepStrictEqual(
        warnings.filter((m) => m.includes("deprecated")),
        [],
      );
      const enumNode = collectChecks(result.ast, code)[0].node;
      assert.strictEqual(code.slice(...enumNode.members[0].range), "a");
    } finally {
      process.off("warning", onWarning);
    }
  });
});
