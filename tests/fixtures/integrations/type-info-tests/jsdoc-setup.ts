import type { Linter } from "eslint";
import { generateParserOptions } from "../../../src/parser/test-utils";
import { rules } from "@typescript-eslint/eslint-plugin";
import * as ts from "@typescript-eslint/parser";
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
      parserOptions: generateParserOptions({ parser: ts }),
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
