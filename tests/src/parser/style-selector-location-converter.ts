import assert from "assert";
import fs from "fs";
import path from "path";
import type { Rule } from "postcss";
import type { Node as SelectorNode } from "postcss-selector-parser";

import { parseForESLint } from "../../../src/index.js";
import { extractSelectorLocations } from "./style-selector-location-converter-utils.js";
import { generateParserOptions, listupFixtures } from "./test-utils.js";
import { LinesAndColumns } from "../../../src/context/index.js";

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

/** Gets the source text at the location of each class and id selector node. */
function getSelectorTexts(code: string): string[] {
  const { services } = parseForESLint(code);
  const styleContext = services.getStyleContext();
  assert.strictEqual(styleContext.status, "success");
  const locs = new LinesAndColumns(code);
  const texts: string[] = [];
  styleContext.sourceAst.walkRules((rule: Rule) => {
    services.getStyleSelectorAST(rule).walk((node: SelectorNode) => {
      if (node.type !== "class" && node.type !== "id") return;
      const loc = services.styleSelectorNodeLoc(node);
      texts.push(
        code.slice(
          locs.getIndexFromLoc(loc.start),
          locs.getIndexFromLoc(loc.end),
        ),
      );
    });
  });
  return texts;
}

describe("Selector locations with line breaks.", () => {
  for (const [name, newline] of [
    ["LF", "\n"],
    ["CRLF", "\r\n"],
    ["CR", "\r"],
  ]) {
    it(`must point to the selector nodes with ${name}`, () => {
      const code = [
        "<div>",
        "</div>",
        "<style>",
        ".a,",
        ".b > #c,",
        "  .d:not(",
        "  .e) {}",
        "</style>",
      ].join(newline);
      assert.deepStrictEqual(getSelectorTexts(code), [
        ".a",
        ".b",
        "#c",
        ".d",
        ".e",
      ]);
    });
  }
});

describe("Selector locations with comments at the end of a line.", () => {
  for (const [name, lines] of [
    ["CSS", ["<style>", ".a, /* c */", ".b {}", "</style>"]],
    ["SCSS", ['<style lang="scss">', ".a, // c", ".b {}", "</style>"]],
  ] as const) {
    for (const [newlineName, newline] of [
      ["LF", "\n"],
      ["CRLF", "\r\n"],
    ]) {
      it(`must point to the selector nodes with ${name} and ${newlineName}`, () => {
        assert.deepStrictEqual(getSelectorTexts(lines.join(newline)), [
          ".a",
          ".b",
        ]);
      });
    }
  }
});
