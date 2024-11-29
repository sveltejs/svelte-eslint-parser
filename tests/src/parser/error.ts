import assert from "assert";
import fs from "fs";
import { parseForESLint } from "../../../src/index.js";
import {
  generateParserOptions,
  listupFixtures,
  astToJson,
  normalizeError,
} from "./test-utils.js";
import path from "path";

const dirname = path.dirname(new URL(import.meta.url).pathname);
const ERROR_FIXTURE_ROOT = path.resolve(dirname, "../../fixtures/parser/error");

function parse(code: string, filePath: string, config: any) {
  return parseForESLint(code, generateParserOptions({ filePath }, config));
}

describe("Check for Error.", () => {
  for (const {
    input,
    inputFileName,
    outputFileName,
    config,
    meetRequirements,
  } of listupFixtures(ERROR_FIXTURE_ROOT)) {
    describe(inputFileName, () => {
      if (!meetRequirements("test")) {
        return;
      }
      it("most to the expected error.", () => {
        try {
          parse(input, inputFileName, config);
        } catch (e) {
          const errorJson = astToJson(normalizeError(e));
          const output = fs.readFileSync(outputFileName, "utf8");
          assert.strictEqual(errorJson, output);
          return;
        }
        assert.fail("Expected error");
      });
    });
  }
});
