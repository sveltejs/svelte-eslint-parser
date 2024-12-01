import { Linter } from "eslint";
import assert from "assert";
import fs from "fs";
import globals from "globals";
import * as parser from "../../../src/index";
import {
  generateParserOptions,
  getMessageData,
  listupFixtures,
} from "./test-utils";

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
    meetRequirements,
  } of listupFixtures()) {
    if (!meetRequirements("parse")) {
      continue;
    }
    const linter = new Linter();
    describe(inputFileName, () => {
      for (const rule of RULES) {
        it(rule, () => {
          const outputFileName = getRuleOutputFileName(rule);
          const messages = linter.verify(
            input,
            {
              files: ["**"],
              languageOptions: {
                parser,
                parserOptions: generateParserOptions(config),
                globals: {
                  ...globals.browser,
                  ...globals.es2021,
                },
              },
              rules: {
                [rule]: "error",
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

            if (!fs.existsSync(outputFileName)) {
              assert.strictEqual(messagesJson, "[]");
            } else {
              const output = fs.readFileSync(outputFileName, "utf8");
              assert.strictEqual(
                JSON.stringify(JSON.parse(messagesJson), null, 2),
                JSON.stringify(JSON.parse(output), null, 2),
              );
            }
          }
        });
      }
    });
  }
});
