/* global require -- node */
import assert from "assert";
import fs from "fs";
import semver from "semver";

import { traverseNodes } from "../../../src/traverse";
import { parseForESLint } from "../../../src";
import {
  generateParserOptions,
  listupFixtures,
  astToJson,
  scopeToJSON,
} from "./test-utils";
import type { Comment, SvelteProgram, Token } from "../../../src/ast";
import { sortNodes } from "../../../src/parser/sort";

function parse(code: string, filePath: string, config: any) {
  return parseForESLint(code, generateParserOptions({ filePath }, config));
}

describe("Check for AST.", () => {
  for (const {
    input,
    inputFileName,
    outputFileName,
    scopeFileName,
    config,
    meetRequirements,
  } of listupFixtures()) {
    describe(inputFileName, () => {
      let result: any;

      it("most to generate the expected AST.", () => {
        result = parse(input, inputFileName, config);
        if (!meetRequirements("test")) {
          return;
        }
        const astJson = astToJson(result.ast);
        const output = fs.readFileSync(outputFileName, "utf8");
        assert.strictEqual(astJson, output);
      });
      if (meetRequirements("scope"))
        it("most to generate the expected scope.", () => {
          let json: any = scopeToJSON(result.scopeManager);
          let output: any = fs.readFileSync(scopeFileName, "utf8");

          if (
            result.services?.program // use ts parser
          ) {
            // eslint-disable-next-line @typescript-eslint/no-require-imports, @typescript-eslint/no-var-requires -- ignore
            const pkg = require("@typescript-eslint/parser/package.json");
            if (!semver.satisfies(pkg.version, "^5.6.0")) {
              // adjust global scope
              json = JSON.parse(json);
              output = JSON.parse(output);
              json.variables = output.variables;
            }
          }

          assert.deepStrictEqual(json, output);
        });

      it("location must be correct.", () => {
        // check tokens
        checkTokens(result.ast, input);

        checkLoc(result.ast, inputFileName, input);
      });

      it("even if Win, it must be correct.", () => {
        const inputForWin = input.replace(/\n/g, "\r\n");
        // check
        const astForWin = parse(inputForWin, inputFileName, config).ast;
        // check tokens
        checkTokens(astForWin, inputForWin);
      });
    });
  }
});

function checkTokens(ast: SvelteProgram, input: string) {
  const allTokens = sortNodes([...ast.tokens, ...ast.comments]);

  // check loc
  for (const token of allTokens) {
    const value = getText(token);

    assert.strictEqual(value, input.slice(...token.range));
  }
  assert.strictEqual(
    input
      .replace(/\s/gu, "")
      .split(/(.{0,20})/)
      .filter((s) => s)
      .join("\n"),
    allTokens
      .map(getText)
      .join("")
      .replace(/\s/gu, "")
      .split(/(.{0,20})/)
      .filter((s) => s)
      .join("\n"),
  );

  function getText(token: Token | Comment) {
    return token.type === "Block"
      ? `/*${token.value}*/`
      : token.type === "Line"
        ? `//${token.value}`
        : token.value;
  }
}

function checkLoc(ast: SvelteProgram, fileName: string, code: string) {
  for (const token of ast.tokens) {
    assert.ok(
      token.range[0] < token.range[1],
      `No range on "${token.type} line:${token.loc.start.line} col:${token.loc.start.column}" in ${fileName}`,
    );
  }
  for (const token of ast.comments) {
    assert.ok(
      token.range[0] < token.range[1],
      `No range on "${token.type} line:${token.loc.start.line} col:${token.loc.start.column}" in ${fileName}`,
    );
  }
  const set = new Set<any>();
  traverseNodes(ast, {
    enterNode(node, parent) {
      if (
        (node.type.startsWith("Svelte") || parent?.type.startsWith("Svelte")) &&
        set.has(node)
      ) {
        assert.fail(
          `Duplicate node @parent: ${parent?.type}, ${astToJson(node)}`,
        );
      }
      set.add(node);
      if (parent?.type.startsWith("Svelte")) {
        assert.ok(
          (node as any).parent?.type === parent?.type,
          `Parent type mismatch [${(node as any).parent
            ?.type} : ${parent?.type}] @${astToJson(node)}`,
        );
      }
      assert.ok(
        (node as any).parent?.range?.[0] === parent?.range![0],
        `Parent range mismatch [${(node as any).parent
          ?.range?.[0]} : ${parent?.range![0]}] @${astToJson(node)}`,
      );
      assert.ok(
        (node as any).parent?.range?.[1] === parent?.range![1],
        `Parent range mismatch [${(node as any).parent
          ?.range?.[1]} : ${parent?.range![1]}] @${astToJson(node)}`,
      );
      assert.ok(
        node.range![0] < node.range![1],
        `No range on "${node.type} line:${node.loc!.start.line} col:${
          node.loc!.start.column
        }" in ${fileName}`,
      );

      if (parent) {
        assert.ok(
          parent.range![0] <= node.range![0],
          `overlap range[0] on "${parent.type} line:${
            parent.loc!.start.line
          } col:${parent.loc!.start.column}" > "${node.type} line:${
            node.loc!.start.line
          } col:${node.loc!.start.column}" in ${fileName}`,
        );
        assert.ok(
          node.range![1] <= parent.range![1],
          `overlap range[1] on "${parent.type} line:${
            parent.loc!.end.line
          } col:${parent.loc!.end.column}" > "${node.type} line:${
            node.loc!.end.line
          } col:${node.loc!.end.column}" in ${fileName}`,
        );

        assert.ok(
          parent.loc!.start.line <= node.loc!.start.line,
          `overlap loc.start.line on "${parent.type} line:${
            parent.loc!.start.line
          } col:${parent.loc!.start.column}" > "${node.type} line:${
            node.loc!.start.line
          } col:${node.loc!.start.column}" in ${fileName}`,
        );
        if (parent.loc!.start.line === node.loc!.start.line) {
          assert.ok(
            parent.loc!.start.column <= node.loc!.start.column,
            `overlap loc.start.column on "${parent.type} line:${
              parent.loc!.start.line
            } col:${parent.loc!.start.column}" > "${node.type} line:${
              node.loc!.start.line
            } col:${node.loc!.start.column}" in ${fileName}`,
          );
        }

        assert.ok(
          node.loc!.end.line <= parent.loc!.end.line,
          `overlap loc.end.line on "${parent.type} line:${
            parent.loc!.end.line
          } col:${parent.loc!.end.column}" > "${node.type} line:${
            node.loc!.end.line
          } col:${node.loc!.end.column}" in ${fileName}`,
        );
        if (parent.loc!.end.line === node.loc!.end.line) {
          assert.ok(
            node.loc!.end.column <= parent.loc!.end.column,
            `overlap loc.end.column on "${parent.type} line:${
              parent.loc!.end.line
            } col:${parent.loc!.end.column}" > "${node.type} line:${
              node.loc!.end.line
            } col:${node.loc!.end.column}" in ${fileName}`,
          );
        }
      }
      if (node.type === "SvelteStartTag") {
        assert.strictEqual(code[node.range[0]], "<");
        assert.strictEqual(code[node.range[1] - 1], ">");
      }
      if (node.type === "SvelteEndTag") {
        assert.strictEqual(code.slice(node.range[0], node.range[0] + 2), "</");
        assert.strictEqual(code[node.range[1] - 1], ">");
      }
    },
    leaveNode() {
      // noop
    },
  });
}
