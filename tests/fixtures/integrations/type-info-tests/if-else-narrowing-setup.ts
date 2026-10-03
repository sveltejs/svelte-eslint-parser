import type { Linter } from "eslint";
import { plugin } from "typescript-eslint";
import * as parser from "../../../../src/index.js";
import { generateParserOptions } from "../../../src/parser/test-utils.js";

export function getConfig(): Linter.Config {
  return {
    plugins: {
      "@typescript-eslint": {
        rules: plugin.rules as any,
      },
    },
    languageOptions: {
      parser,
      parserOptions: generateParserOptions(),
    },
    rules: {
      "@typescript-eslint/no-unsafe-member-access": "error",
    },
  };
}
