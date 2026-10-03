import assert from "assert";
import fs from "fs";
import os from "os";
import path from "path";
import * as tsParser from "@typescript-eslint/parser";
import type { TSESTree } from "@typescript-eslint/types";
import { Linter } from "eslint";
import type { ESLint } from "eslint";
import { plugin } from "typescript-eslint";
import * as parser from "../../../../src/index.js";
import { parseForESLint } from "../../../../src/index.js";
import { traverseNodes } from "../../../../src/traverse.js";
import { svelteVersion } from "../../../../src/parser/svelte-version.js";

const script = `
/** @typedef {import('./types.js').Item} Item */
/** @type {Item} */
const item = { count: 1 };
/** @param {number} x */
function increment(x) { return x + item.count; }
const count = ${svelteVersion.gte(5) ? "$state(increment(1))" : "increment(1)"};
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
      `export interface Item { count: number; name?: string }
export type Result<T> = { ok: true; value: T } | { ok: false; error: string };
export type Selected<T> = Readonly<Pick<T, Extract<keyof T, 'count'>>>;
export type Unwrap<T> = T extends Promise<infer U> ? U : T;`,
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
    /* eslint-disable no-process-env -- Exercise typescript-eslint's CI-specific parsing mode. */
    for (const ci of [false, true]) {
      it(`lints complex JSDoc types with ${projectMode}, CI=${ci}`, () => {
        const previousCI = process.env.CI;
        process.env.CI = String(ci);
        try {
          const code = `<script>
/** @typedef {import('./types.js').Item} Item */
/** @typedef {import('./types.js').Result<Item>} Result */
/** @type {import('./types.js').Selected<Item>} */
const selected = { count: 1 };
/** @type {import('./types.js').Unwrap<Promise<Item>>} */
const unwrapped = { count: 2 };
/** @template T @param {T} value @returns {T} */
function identity(value) { return value; }
/** @param {Result} result @returns {number} */
function read(result) {
  return result.ok ? identity(result.value).count : result.error.length;
}
/** @param {number} value */
function consume(value) { return value.toFixed(); }
/** @param {Result} result @returns {Result} */
function keep(result) { return result; }
const result = keep({ ok: true, value: unwrapped });
const items = [identity(selected)];
const pending = Promise.resolve(items);
/** @returns {Promise<Item>} */
async function load() { return unwrapped; }
void load();
consume(read(result));
</script>
{#if result.ok}
  {consume(result.value.count)}
{:else if !result.ok}
  {result.error.toUpperCase()}
{/if}
{#each items as item}
  {consume(item.count)}
{/each}
{#await pending then values}
  {consume(values[0].count)}
{/await}`;
          const linter = new Linter({ cwd: directory });
          const config = {
            files: ["**/*.svelte"],
            plugins: { "@typescript-eslint": plugin as ESLint.Plugin },
            languageOptions: {
              parser,
              parserOptions: {
                parser: tsParser,
                tsconfigRootDir: directory,
                extraFileExtensions: [".svelte"],
                [projectMode]:
                  projectMode === "project" ? "./tsconfig.json" : true,
              },
            },
            rules: {
              "@typescript-eslint/no-unsafe-argument": "error",
              "@typescript-eslint/no-unsafe-assignment": "error",
              "@typescript-eslint/no-unsafe-call": "error",
              "@typescript-eslint/no-unsafe-member-access": "error",
              "@typescript-eslint/no-unsafe-return": "error",
              "@typescript-eslint/no-floating-promises": "error",
              "@typescript-eslint/await-thenable": "error",
              "@typescript-eslint/restrict-plus-operands": [
                "error",
                { allowNumberAndString: false },
              ],
            },
          } satisfies Linter.Config;
          const filename = path.join(directory, "Component.svelte");
          assert.deepStrictEqual(linter.verify(code, config, filename), []);

          // Each invalid expression must produce a diagnostic at its own location.
          const invalid = code
            .replace("void load();", "load();\nawait selected;")
            .replace("return unwrapped;", "return JSON.parse('{}');")
            .replace("consume(read(result));", "consume(JSON.parse('{}'));")
            .replace("consume(item.count)", 'item.count + "oops"')
            .replace("consume(values[0].count)", 'values[0].count + "oops"');
          const expected = [
            ["no-unsafe-return", "async function load"],
            ["no-floating-promises", "load();"],
            ["await-thenable", "await selected;"],
            ["no-unsafe-argument", "consume(JSON.parse('{}'));"],
            ["restrict-plus-operands", '{item.count + "oops"}'],
            ["restrict-plus-operands", '{values[0].count + "oops"}'],
          ].map(([rule, source]) => ({
            ruleId: `@typescript-eslint/${rule}`,
            line:
              invalid.split("\n").findIndex((line) => line.includes(source)) +
              1,
          }));
          assert.deepStrictEqual(
            linter
              .verify(invalid, config, filename)
              .map(({ ruleId, line }) => ({
                ruleId,
                line,
              })),
            expected,
          );
        } finally {
          if (previousCI === undefined) delete process.env.CI;
          else process.env.CI = previousCI;
        }
      });
    }
    /* eslint-enable no-process-env -- Restore environment access restrictions. */
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
