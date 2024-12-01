import type { Linter } from "eslint";
import { generateParserOptions } from "../../../src/parser/test-utils";
import * as svelte from "eslint-plugin-svelte";
import globals from "globals";
import * as parser from "../../../../src";

export function getConfig(): Linter.Config {
  return {
    plugins: {
      svelte: svelte as any,
    },
    languageOptions: {
      parser,
      parserOptions: generateParserOptions(),
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
    rules: {
      "svelte/no-immutable-reactive-statements": "error",
    },
  };
}
