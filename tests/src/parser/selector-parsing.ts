import assert from "assert";
import fs from "fs";
import path from "path";
import type { Node } from "postcss";
import type { Root as SelectorRoot } from "postcss-selector-parser";

import { parseForESLint } from "../../../src/index.js";
import {
  generateParserOptions,
  listupFixtures,
  selectorAstToJson,
} from "./test-utils.js";

const dirname = path.dirname(new URL(import.meta.url).pathname);
const SELECTOR_PARSING_FIXTURE_ROOT = path.resolve(
  dirname,
  "../../fixtures/parser/selector-parsing",
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
  } of listupFixtures(SELECTOR_PARSING_FIXTURE_ROOT)) {
    if (!meetRequirements("parse")) {
      continue;
    }
    describe(inputFileName, () => {
      let services: any;

      it("most to generate the expected selector AST.", () => {
        services = parse(input, inputFileName, config).services;
        if (!meetRequirements("test")) {
          return;
        }
        const styleContext = services.getStyleContext();
        assert.strictEqual(styleContext.status, "success");
        const selectorASTs: SelectorRoot[] = [];
        styleContext.sourceAst.walk((node: Node) => {
          if (node.type === "rule") {
            selectorASTs.push(services.getStyleSelectorAST(node));
          }
        });
        const output = fs.readFileSync(outputFileName, "utf8");
        assert.strictEqual(`${selectorAstToJson(selectorASTs)}\n`, output);
      });
    });
  }
});
