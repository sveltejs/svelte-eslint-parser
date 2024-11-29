import assert from "assert";
import fs from "fs";
import path from "path";

import { parseForESLint } from "../../../src/index.js";
import {
  generateParserOptions,
  listupFixtures,
  styleContextToJson,
} from "./test-utils.js";

const dirname = path.dirname(new URL(import.meta.url).pathname);
const STYLE_CONTEXT_FIXTURE_ROOT = path.resolve(
  dirname,
  "../../fixtures/parser/style-context",
);

function parse(code: string, filePath: string, config: any) {
  return parseForESLint(code, generateParserOptions({ filePath }, config));
}

describe("Check for AST.", () => {
  for (const {
    input,
    inputFileName,
    outputFileName,
    config,
    meetRequirements,
  } of listupFixtures(STYLE_CONTEXT_FIXTURE_ROOT)) {
    if (!meetRequirements("parse")) {
      continue;
    }
    describe(inputFileName, () => {
      let result: any;

      it("most to generate the expected style context.", () => {
        result = parse(input, inputFileName, config);
        if (!meetRequirements("test")) {
          return;
        }
        const styleContext = result.services.getStyleContext();
        const output = fs.readFileSync(outputFileName, "utf8");
        assert.strictEqual(`${styleContextToJson(styleContext)}\n`, output);
      });
    });
  }
});
