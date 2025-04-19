import type { Linter } from "eslint";
import { generateParserOptions } from "../../../src/parser/test-utils.js";
import { plugin } from "typescript-eslint";
import * as parser from "../../../../src/index.js";
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
      "@typescript-eslint/no-unused-vars": "error",
    },
  };
}
