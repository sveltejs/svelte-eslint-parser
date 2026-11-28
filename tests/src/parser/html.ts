import { describe, it } from "node:test";
import assert from "node:assert/strict";
import fs from "fs";
import path from "path";

import { parseAttributes } from "../../../src/parser/html.js";
import { PARSE_ATTRIBUTES_CASES } from "./html-test-cases.js";

const dirname = path.dirname(new URL(import.meta.url).pathname);
const OUTPUT_FILE = path.resolve(
  dirname,
  "../../fixtures/parser/html/parse-attributes-output.json",
);

describe("parseAttributes", () => {
  const expected: { input: string; index: number; result: unknown }[] =
    JSON.parse(fs.readFileSync(OUTPUT_FILE, "utf8"));
  for (const { input, index = 0 } of PARSE_ATTRIBUTES_CASES) {
    it(input || "(empty)", () => {
      const output = expected.find(
        (e) => e.input === input && e.index === index,
      );
      assert.ok(output, "Run `pnpm run update-fixtures` to add the output.");
      assert.deepStrictEqual(
        JSON.parse(JSON.stringify(parseAttributes(input, index))),
        output.result,
      );
    });
  }
});
