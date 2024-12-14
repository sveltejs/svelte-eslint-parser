import assert from "assert";
import fs from "fs";
import path from "path";

import { parseForESLint } from "../../../src/index.js";
import { extractSelectorLocations } from "./style-selector-location-converter-utils.js";
import { generateParserOptions, listupFixtures } from "./test-utils.js";

const dirname = path.dirname(new URL(import.meta.url).pathname);
const SELECTOR_CONVERTER_FIXTURE_ROOT = path.resolve(
  dirname,
  "../../fixtures/parser/style-selector-location-converter",
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
  } of listupFixtures(SELECTOR_CONVERTER_FIXTURE_ROOT)) {
    describe(inputFileName, () => {
      let services: any;

      it("most to generate the expected style context.", () => {
        services = parse(input, inputFileName, config).services;
        if (!meetRequirements("test")) {
          return;
        }
        const styleContext = services.getStyleContext();
        assert.strictEqual(styleContext.status, "success");
        const locations = extractSelectorLocations(
          services,
          styleContext.sourceAst,
        );
        const output = fs.readFileSync(outputFileName, "utf8");
        assert.strictEqual(
          `${JSON.stringify(locations, undefined, 2)}\n`,
          output,
        );
      });
    });
  }
});
