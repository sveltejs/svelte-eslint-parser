import assert from "assert";
import fs from "fs";
import { parseForESLint } from "../../../src";
import {
  BASIC_PARSER_OPTIONS,
  listupFixtures,
  astToJson,
  normalizeError,
} from "./test-utils";
import path from "path";

const ERROR_FIXTURE_ROOT = path.resolve(
  __dirname,
  "../../fixtures/parser/error"
);

function parse(code: string, filePath: string) {
  return parseForESLint(code, {
    ...BASIC_PARSER_OPTIONS!,
    filePath,
  });
}

describe("Check for Error.", () => {
  for (const {
    input,
    inputFileName,
    outputFileName,
    meetRequirements,
  } of listupFixtures(ERROR_FIXTURE_ROOT)) {
    describe(inputFileName, () => {
      if (!meetRequirements("test")) {
        return;
      }
      it("most to the expected error.", () => {
        try {
          parse(input, inputFileName);
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
