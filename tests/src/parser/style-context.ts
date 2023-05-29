import assert from "assert";
import fs from "fs";
import path from "path";

import { parseForESLint } from "../../../src";
import type { StyleContext } from "../../../src/parser/style-context";
import { generateParserOptions, listupFixtures } from "./test-utils";

const STYLE_CONTEXT_FIXTURE_ROOT = path.resolve(
  __dirname,
  "../../fixtures/parser/style-context"
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

function styleContextToJson(styleContext: StyleContext): string {
  return JSON.stringify(styleContext, nodeReplacer, 2);
}

function nodeReplacer(key: string, value: any): any {
  if (key === "file") {
    return undefined;
  }
  return value;
}
