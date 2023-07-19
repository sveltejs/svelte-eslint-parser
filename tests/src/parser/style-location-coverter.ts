import assert from "assert";
import fs from "fs";
import path from "path";
import type { Node } from "postcss";

import { parseForESLint } from "../../../src";
import type { SourceLocation } from "../../../src/ast";
import { generateParserOptions, listupFixtures } from "./test-utils";

const STYLE_CONTEXT_FIXTURE_ROOT = path.resolve(
  __dirname,
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
  } of listupFixtures(STYLE_CONTEXT_FIXTURE_ROOT)) {
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
          Partial<SourceLocation>,
          [number | undefined, number | undefined],
        ][] = [
          [
            services.styleNodeLoc(styleContext.sourceAst),
            services.styleNodeRange(styleContext.sourceAst),
          ],
        ];
        styleContext.sourceAst.walk((node: Node) => {
          locations.push([
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
