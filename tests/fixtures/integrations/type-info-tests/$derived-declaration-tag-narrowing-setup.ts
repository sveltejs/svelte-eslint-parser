import type { Linter } from "eslint";
import { generateParserOptions } from "../../../src/parser/test-utils";
import { plugin } from "typescript-eslint";
import * as parser from "../../../../src";
import globals from "globals";

export function getConfig(): Linter.Config {
  return {
    plugins: {
      "@typescript-eslint": {
        rules: plugin.rules as any,
      },
    },
    languageOptions: {
      parser,
      parserOptions: {
        ...generateParserOptions(),
        svelteFeatures: { runes: true },
      },
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      "@typescript-eslint/no-unsafe-argument": "error",
      "@typescript-eslint/no-unsafe-assignment": "error",
      "@typescript-eslint/no-unsafe-call": "error",
      "@typescript-eslint/no-unsafe-member-access": "error",
      "@typescript-eslint/no-unsafe-return": "error",
    },
  };
}
