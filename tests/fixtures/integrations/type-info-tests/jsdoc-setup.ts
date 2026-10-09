import type { ESLint, Linter } from "eslint";
import { generateParserOptions } from "../../../src/parser/test-utils.js";
import { parser as tsParser, plugin } from "typescript-eslint";
import * as parser from "../../../../src/index.js";

export function getConfig(): Linter.Config {
  return {
    plugins: { "@typescript-eslint": plugin as ESLint.Plugin },
    languageOptions: {
      parser,
      parserOptions: generateParserOptions({ parser: tsParser }),
    },
    rules: {
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
      "@typescript-eslint/restrict-plus-operands": "error",
    },
  };
}
