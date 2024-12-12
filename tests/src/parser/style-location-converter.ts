import assert from "assert";
import fs from "fs";
import path from "path";
import type { Node } from "postcss";

import { parseForESLint } from "../../../src/index.js";
import { generateParserOptions, listupFixtures } from "./test-utils.js";
import type { SourceLocation } from "../../../src/ast/common.js";

const dirname = path.dirname(new URL(import.meta.url).pathname);
const STYLE_LOCATION_CONVERTER_FIXTURE_ROOT = path.resolve(
  dirname,
  "../../fixtures/parser/style-location-converter",
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
  } of listupFixtures(STYLE_LOCATION_CONVERTER_FIXTURE_ROOT)) {
    describe(inputFileName, () => {
      let services: any;

      it("most to generate the expected style context.", () => {
        services = parse(input, inputFileName, config).services;
        if (!meetRequirements("test")) {
          return;
        }
        const styleContext = services.getStyleContext();
        assert.strictEqual(styleContext.status, "success");
        const locations: [
          string,
          Partial<SourceLocation>,
          [number | undefined, number | undefined],
        ][] = [
          [
            "root",
            services.styleNodeLoc(styleContext.sourceAst),
            services.styleNodeRange(styleContext.sourceAst),
          ],
        ];
        styleContext.sourceAst.walk((node: Node) => {
          locations.push([
            node.type,
            services.styleNodeLoc(node),
            services.styleNodeRange(node),
          ]);
        });
        const output = fs.readFileSync(outputFileName, "utf8");
        assert.strictEqual(
          `${JSON.stringify(locations, undefined, 2)}\n`,
          output,
        );
      });
    });
  }
});
