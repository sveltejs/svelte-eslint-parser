import fs from "fs";
import path from "path";
import { Linter } from "eslint";
import * as parser from "../src/index";
import { parseForESLint } from "../src/parser";
import {
  BASIC_PARSER_OPTIONS,
  getMessageData,
  listupFixtures,
  nodeReplacer,
  normalizeError,
  scopeToJSON,
} from "../tests/src/parser/test-utils";
import type ts from "typescript";
import type ESTree from "estree";

const ERROR_FIXTURE_ROOT = path.resolve(
  __dirname,
  "../tests/fixtures/parser/error"
);

const RULES = [
  "no-unused-labels",
  "no-extra-label",
  "no-undef",
  "no-unused-vars",
  "no-unused-expressions",
  "space-infix-ops",
  "no-setter-return",
  "no-import-assign",
  "prefer-const",
  "spaced-comment",
  "no-redeclare",
  "template-curly-spacing",
];

/**
 * Parse
 */
function parse(code: string, filePath: string) {
  return parseForESLint(code, {
    ...BASIC_PARSER_OPTIONS!,
    filePath,
  });
}

for (const { input, inputFileName, outputFileName } of listupFixtures(
  ERROR_FIXTURE_ROOT
)) {
  // eslint-disable-next-line no-console -- ignore
  console.log(inputFileName);
  try {
    parse(input, inputFileName);
  } catch (e) {
    const errorJson = JSON.stringify(normalizeError(e), nodeReplacer, 2);
    fs.writeFileSync(outputFileName, errorJson, "utf8");
  }
}

for (const {
  input,
  inputFileName,
  outputFileName,
  scopeFileName,
  typeFileName,
  getRuleOutputFileName,
} of listupFixtures()) {
  try {
    // eslint-disable-next-line no-console -- ignore
    console.log(inputFileName);
    const result = parse(input, inputFileName);
    const astJson = JSON.stringify(result.ast, nodeReplacer, 2);
    fs.writeFileSync(outputFileName, astJson, "utf8");
    const scopeJson = scopeToJSON(result.scopeManager);
    fs.writeFileSync(scopeFileName, scopeJson, "utf8");

    if (typeFileName) {
      fs.writeFileSync(typeFileName, buildTypes(input, result), "utf8");
    }
  } catch (e) {
    // eslint-disable-next-line no-console -- ignore
    console.error(e);
    throw e;
  }

  const linter = createLinter();
  for (const rule of RULES) {
    const ruleOutputFileName = getRuleOutputFileName(rule);
    const messages = linter.verify(
      input,
      {
        parser: "svelte-eslint-parser",
        parserOptions: BASIC_PARSER_OPTIONS,
        rules: {
          [rule]: "error",
        },
        env: {
          browser: true,
          es2021: true,
        },
      },
      inputFileName
    );

    if (messages.length === 0) {
      if (fs.existsSync(ruleOutputFileName)) fs.unlinkSync(ruleOutputFileName);
    } else {
      const messagesJson = JSON.stringify(
        messages.map((m) => {
          return getMessageData(input, m);
        }),
        null,
        2
      );
      fs.writeFileSync(ruleOutputFileName, messagesJson, "utf8");
    }
  }
}

// eslint-disable-next-line require-jsdoc -- X
function createLinter() {
  const linter = new Linter();

  linter.defineParser("svelte-eslint-parser", parser as any);

  return linter;
}

// eslint-disable-next-line require-jsdoc -- X
function buildTypes(
  input: string,
  result: {
    ast: parser.AST.SvelteProgram;
    services: Record<string, any>;
    visitorKeys: { [type: string]: string[] };
  }
): string {
  const scriptLineRange: [number, number][] = [];
  for (const body of result.ast.body) {
    if (body.type === "SvelteScriptElement" && body.body.length) {
      scriptLineRange.push([
        body.body[0].loc!.start.line - 1,
        body.body[body.body.length - 1].loc!.end.line - 1,
      ]);
    }
  }

  const tsNodeMap: ReadonlyMap<any, ts.Node> =
    result.services.esTreeNodeToTSNodeMap;
  const checker: ts.TypeChecker =
    result.services.program && result.services.program.getTypeChecker();

  const checked = new Set();

  const lines = input.split(/\r?\n/);
  const types: string[][] = [];

  // eslint-disable-next-line require-jsdoc -- X
  function addType(node: ESTree.Expression) {
    const tsNode = tsNodeMap.get(node)!;
    const type = checker.getTypeAtLocation(tsNode);
    const typeText = checker.typeToString(type);
    const lineTypes = (types[node.loc!.start.line - 1] ??= []);
    if (node.type === "Identifier") {
      lineTypes.push(`${node.name}: ${typeText}`);
    } else {
      lineTypes.push(`${input.slice(...node.range!)}: ${typeText}`);
    }
  }

  parser.traverseNodes(result.ast, {
    visitorKeys: result.visitorKeys,
    enterNode(node, parent) {
      if (checked.has(parent)) {
        checked.add(node);
        return;
      }

      if (
        node.type === "CallExpression" ||
        node.type === "Identifier" ||
        node.type === "MemberExpression"
      ) {
        addType(node);
        checked.add(node);
      }
    },
    leaveNode() {
      // noop
    },
  });
  return lines
    .map((l, i) => {
      if (!types[i]) {
        return l;
      }
      if (scriptLineRange.some(([s, e]) => s <= i && i <= e)) {
        return `${l} // ${types[i].join(", ")}`;
      }
      return `${l} <!-- ${types[i].join(", ")} -->`;
    })
    .join("\n");
}
