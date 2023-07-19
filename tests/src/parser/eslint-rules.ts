import { Linter } from "eslint";
import assert from "assert";
import fs from "fs";
import * as parser from "../../../src/index";
import {
  generateParserOptions,
  getMessageData,
  listupFixtures,
} from "./test-utils";

function createLinter() {
  const linter = new Linter();

  linter.defineParser("svelte-eslint-parser", parser as any);

  return linter;
}

//------------------------------------------------------------------------------
// Tests
//------------------------------------------------------------------------------

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

describe("svelte-eslint-parser with ESLint rules", () => {
  for (const {
    input,
    inputFileName,
    config,
    getRuleOutputFileName,
  } of listupFixtures()) {
    const linter = createLinter();
    describe(inputFileName, () => {
      for (const rule of RULES) {
        it(rule, () => {
          const outputFileName = getRuleOutputFileName(rule);
          const messages = linter.verify(
            input,
            {
              parser: "svelte-eslint-parser",
              parserOptions: generateParserOptions(config),
              rules: {
                [rule]: "error",
              },
              env: {
                browser: true,
                es2021: true,
              },
            },
            inputFileName,
          );

          if (messages.length === 0) {
            assert.strictEqual(
              fs.existsSync(outputFileName),
              false,
              "Expected empty messages",
            );
          } else {
            const messagesJson = JSON.stringify(
              messages.map((m) => {
                return getMessageData(input, m);
              }),
              null,
              2,
            );
            const output = fs.readFileSync(outputFileName, "utf8");
            assert.strictEqual(messagesJson, output);
          }
        });
      }
    });
  }
});
