import type { Linter } from "eslint";
import { generateParserOptions } from "../../../src/parser/test-utils";
import { rules } from "@typescript-eslint/eslint-plugin";
import * as parser from "../../../../src";
import globals from "globals";

export function getConfig(): Linter.Config {
  return {
    plugins: {
      "@typescript-eslint": {
        rules: rules as any,
      },
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
      "@typescript-eslint/no-confusing-void-expression": "error",
      "@typescript-eslint/explicit-function-return-type": "error",
      "no-unreachable": "error",
    },
  };
}
