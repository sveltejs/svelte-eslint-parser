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

/**
 * Gets the source text at the location of each class and id selector node.
 * It also checks that the location of each selector node is a real position
 * in the code, because `getIndexFromLoc()` accepts a column past the end of a line.
 */
function getSelectorTexts(code: string): string[] {
  const { services } = parseForESLint(code);
  const styleContext = services.getStyleContext();
  assert.strictEqual(styleContext.status, "success");
  const locs = new LinesAndColumns(code);
  const texts: string[] = [];
  styleContext.sourceAst.walkRules((rule: Rule) => {
    services.getStyleSelectorAST(rule).walk((node: SelectorNode) => {
      const loc = services.styleSelectorNodeLoc(node);
      for (const position of [loc.start, loc.end]) {
        assert.deepStrictEqual(
          locs.getLocFromIndex(locs.getIndexFromLoc(position)),
          position,
        );
      }
      if (node.type !== "class" && node.type !== "id") return;
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

  it("must point to the selector nodes with U+2028", () => {
    const code = "<style>\n.a,\u2028.b {}\n</style>";
    assert.deepStrictEqual(getSelectorTexts(code), [".a", ".b"]);
  });
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

describe("Selector locations with comments that PostCSS removes from the selector.", () => {
  for (const [name, code, expected] of [
    [
      "a comment before a node",
      "<style>.a /* c */ .b {}</style>",
      [".a", ".b"],
    ],
    [
      "comments with line breaks",
      "<style>\n.a, /* c\nc */\n.b,\r\n/* c\r\nc */ #d {}</style>",
      [".a", ".b", "#d"],
    ],
    [
      "comments in a pseudo",
      "<style>.a:not(/* c */ .b) /* c */ .c {}</style>",
      [".a", ".b", ".c"],
    ],
    [
      "a comment that is kept",
      "<style>.a /* c *//* c */#b {}</style>",
      [".a", "#b"],
    ],
    [
      "comments in strings",
      '<style>[a="/*"][b="\\"/*"] /* c */ .b {}</style>',
      [".b"],
    ],
    [
      "SCSS line comments",
      '<style lang="scss">.a // c\n.b, // c\r\n#c {}</style>',
      [".a", ".b", "#c"],
    ],
    [
      "comments in a row",
      "<style>.a /* c *//* c */ .b {}</style>",
      [".a", ".b"],
    ],
    [
      "a quote in a kept comment",
      '<style>.a/* " */.b /* c */ .c {}</style>',
      [".a", ".b", ".c"],
    ],
    [
      "a backslash before a comment",
      "<style>.x .a\\/* c */ .b, .y\\\\/* c */ .z {}</style>",
      // PostCSS removes the comment, so `\ ` is an escaped space.
      [".x", ".a\\/* c */ ", ".b", ".y\\\\", ".z"],
    ],
    [
      "SCSS line comments after a backslash",
      '<style lang="scss">.x .a\\// c\n.b {}</style>',
      [".x", ".a\\", ".b"],
    ],
    ["`//` in CSS", "<style>.a:is(url(//x)) .b {}</style>", [".a", ".b"]],
    [
      "`//` in `url()` in SCSS",
      '<style lang="scss">.a:is(url(//x)) /* c */ .b {}</style>',
      [".a", ".b"],
    ],
  ] as const) {
    it(`must point to the selector nodes with ${name}`, () => {
      assert.deepStrictEqual(getSelectorTexts(code), expected);
    });
  }
});

it("must point to the selector node after SCSS interpolation", () => {
  // postcss-selector-parser does not support SCSS interpolation, so only check the next node.
  const texts = getSelectorTexts(
    '<style lang="scss">.a-#{$x} /* c */ .b {}</style>',
  );
  assert.strictEqual(texts[texts.length - 1], ".b");
});
