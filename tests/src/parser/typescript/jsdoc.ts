import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import * as tsParser from "@typescript-eslint/parser";
import type { TSESTree } from "@typescript-eslint/types";
import { parseForESLint } from "../../../../src/index.js";
import { traverseNodes } from "../../../../src/traverse.js";

const script = `
/** @typedef {import('./types.js').Item} Item */
/** @type {Item} */
const item = { count: 1 };
/** @param {number} x */
function increment(x) { return x + item.count; }
const count = $state(increment(1));
`;

describe("JavaScript type information", () => {
  const directory = fs.mkdtempSync(path.join(os.tmpdir(), "svelte-jsdoc-"));
  before(() => {
    fs.writeFileSync(
      path.join(directory, "tsconfig.json"),
      JSON.stringify({
        compilerOptions: { strict: true, allowJs: true, module: "Node16" },
        include: ["**/*"],
      }),
    );
    fs.writeFileSync(
      path.join(directory, "types.ts"),
      "export interface Item { count: number }",
    );
    for (const file of ["Component.svelte", "state.svelte.js"]) {
      fs.writeFileSync(path.join(directory, file), "");
    }
  });
  after(() => {
    tsParser.clearCaches();
    fs.rmSync(directory, { recursive: true, force: true });
  });

  for (const projectMode of ["project", "projectService"] as const) {
    it(`updates JSDoc types after edits with ${projectMode}`, () => {
      const results = [];
      for (const type of ["number", "string"]) {
        const result = parseForESLint(
          `<script>/** @param {${type}} value */\nfunction identity(value) { return value; }</script>`,
          {
            parser: { js: tsParser },
            filePath: path.join(directory, "Component.svelte"),
            tsconfigRootDir: directory,
            extraFileExtensions: [".svelte"],
            [projectMode]: projectMode === "project" ? "./tsconfig.json" : true,
          },
        );
        const element = result.ast.body[0];
        assert.strictEqual(element.type, "SvelteScriptElement");
        if (element.type !== "SvelteScriptElement") return;
        const fn = element.body[0] as TSESTree.FunctionDeclaration;
        results.push({ services: result.services, param: fn.params[0], type });
      }
      // A later lint must not mutate the program returned for an earlier lint.
      for (const { services, param, type } of results) {
        const checker = services.program.getTypeChecker();
        assert.strictEqual(
          checker.typeToString(
            checker.getTypeAtLocation(
              services.esTreeNodeToTSNodeMap.get(param),
            ),
          ),
          type,
        );
      }
    });
    for (const lang of [undefined, "js", "javascript", "svelte.js"]) {
      it(`preserves JSDoc and rune types with ${projectMode}, lang=${lang}`, () => {
        const isScript = lang === "svelte.js";
        const filePath = path.join(
          directory,
          isScript ? "state.svelte.js" : "Component.svelte",
        );
        const code = isScript
          ? script
          : `<script${lang ? ` lang="${lang}"` : ""}>${script}</script>{increment(count)}`;
        const result = parseForESLint(code, {
          parser: tsParser,
          filePath,
          tsconfigRootDir: directory,
          extraFileExtensions: [".svelte"],
          [projectMode]: projectMode === "project" ? "./tsconfig.json" : true,
        });
        const checker = result.services.program.getTypeChecker();
        const types = new Map<string, string[]>();
        traverseNodes(result.ast, {
          visitorKeys: result.visitorKeys,
          enterNode(node) {
            if (node.type !== "Identifier") return;
            const tsNode = result.services.esTreeNodeToTSNodeMap.get(
              node as TSESTree.Identifier,
            );
            if (!tsNode) return;
            const found = types.get(node.name) ?? [];
            found.push(checker.typeToString(checker.getTypeAtLocation(tsNode)));
            types.set(node.name, found);
          },
          leaveNode() {
            // Nothing to restore.
          },
        });
        for (const name of ["x", "count"]) {
          assert.ok(types.get(name)?.length, `missing ${name}`);
          assert.ok(
            types.get(name)!.every((type) => type === "number"),
            `${name}: ${types.get(name)}`,
          );
        }
        assert.ok(types.get("item")!.every((type) => type === "Item"));
        assert.ok(
          types
            .get("increment")!
            .every((type) => type === "(x: number) => number"),
        );
      });
    }
  }

  it("respects language-specific parser selection", () => {
    const result = parseForESLint(`<script>${script}</script>`, {
      parser: { ts: tsParser },
    });
    assert.strictEqual(result.services.program, undefined);
    assert.strictEqual(result.ast.body[0].type, "SvelteScriptElement");
  });

  it("can parse JSDoc without a project or TypeScript parser", () => {
    for (const parser of [undefined, tsParser, { js: tsParser }]) {
      const result = parseForESLint(`<script>${script}</script>`, { parser });
      assert.ok(
        result.ast.comments.some((comment) => comment.value.includes("@param")),
      );
    }
  });
});
