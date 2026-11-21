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

describe("Check for the error location of script blocks on the same line.", () => {
  const code =
    '<script context="module">export const x = 1</script><script>let a = 1 +* 2</script>\n';
  const errorIndex = code.indexOf("*");

  /** A parser that throws an error with only `lineNumber` and `column`. */
  function createParser(extra: Record<string, unknown>, locInMessage = false) {
    return {
      parse(virtualCode: string) {
        const lines = virtualCode.slice(0, errorIndex).split("\n");
        const lineNumber = lines.length;
        const column = lines[lines.length - 1].length + 1;
        const message = locInMessage
          ? `Unexpected token (${lineNumber}:${column})`
          : "Unexpected token";
        throw Object.assign(new SyntaxError(message), {
          lineNumber,
          column,
          ...extra,
        });
      },
    };
  }

  for (const [name, extra] of [
    ["without `index`", {}],
    ["with `pos`", { pos: errorIndex }],
  ] as const) {
    it(name, () => {
      try {
        parseForESLint(code, { parser: createParser(extra) });
      } catch (e: any) {
        assert.strictEqual(e.lineNumber, 1);
        assert.strictEqual(e.column, errorIndex + 1);
        return;
      }
      assert.fail("Expected error");
    });
  }

  it("with the location at the end of the message", () => {
    try {
      parseForESLint(code, {
        parser: createParser({ pos: errorIndex }, true),
      });
    } catch (e: any) {
      assert.strictEqual(e.lineNumber, 1);
      assert.strictEqual(e.column, errorIndex + 1);
      assert.strictEqual(e.message, `Unexpected token (1:${errorIndex + 1})`);
      return;
    }
    assert.fail("Expected error");
  });
});
