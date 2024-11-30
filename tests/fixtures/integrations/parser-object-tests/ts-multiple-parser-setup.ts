import { generateParserOptions } from "../../../src/parser/test-utils";
import * as ts from "@typescript-eslint/parser";
import globals from "globals";
import * as parser from "../../../../src";
import type { Linter } from "eslint";

export function getConfig(): Linter.Config {
  return {
    languageOptions: {
      parser,
      parserOptions: generateParserOptions({ parser: { ts } }),
      globals: {
        ...globals.browser,
        ...globals.es2021,
      },
    },
  };
}
