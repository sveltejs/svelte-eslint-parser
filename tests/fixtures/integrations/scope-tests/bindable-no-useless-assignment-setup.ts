import type { Linter } from "eslint";
import { generateParserOptions } from "../../../src/parser/test-utils";
import * as parser from "../../../../src";
import globals from "globals";

export function getConfig(): Linter.Config {
  return {
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
      "no-useless-assignment": "error",
      "no-unused-vars": "error",
    },
  };
}
