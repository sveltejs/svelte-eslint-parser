/* global require -- node */
import { Linter } from "eslint";
import assert from "assert";
import fs from "fs";
import globals from "globals";
import * as parser from "../../src";
import {
  generateParserOptions,
  getMessageData,
  listupFixtures,
} from "./parser/test-utils";
import path from "path";

const FIXTURE_ROOT = path.resolve(__dirname, "../fixtures/integrations");

describe("Integration tests.", () => {
  for (const {
    input,
    inputFileName,
    outputFileName,
    config,
    meetRequirements,
  } of listupFixtures(FIXTURE_ROOT)) {
    if (!meetRequirements("parse")) {
      continue;
    }
    it(inputFileName, () => {
      const setupFileName = inputFileName.replace(
        /input\.svelte(?:\.[jt]s)?$/u,
        "setup.ts",
      );
      const setup = fs.existsSync(setupFileName)
        ? // eslint-disable-next-line @typescript-eslint/no-require-imports -- test
          require(setupFileName)
        : null;
      const linter = new Linter();
      const messages = linter.verify(
        input,
        {
          files: ["**"],
          ...(setup?.getConfig?.() ?? {
            languageOptions: {
              parser,
              parserOptions: generateParserOptions(config),
              globals: {
                ...globals.browser,
                ...globals.es2021,
              },
            },
          }),
        },
        inputFileName,
      );
      const messagesJson = JSON.stringify(
        messages.map((m) => {
          return {
            ...getMessageData(input, m),
            message: m.message,
          };
        }),
        null,
        2,
      );

      if (fs.existsSync(outputFileName)) {
        const output = fs.readFileSync(outputFileName, "utf8");
        assert.strictEqual(messagesJson, output);
      } else {
        fs.writeFileSync(outputFileName, messagesJson, "utf8");
      }
    });
  }
});
