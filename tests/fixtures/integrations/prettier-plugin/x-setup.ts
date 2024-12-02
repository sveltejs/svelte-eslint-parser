import type { Linter } from "eslint";
import { generateParserOptions } from "../../../src/parser/test-utils.js";
import prettier from "eslint-plugin-prettier";
import * as parser from "../../../../src/index.js";
import globals from "globals";

export function getConfig(): Linter.Config {
  return {
    plugins: {
      prettier,
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
      "prettier/prettier": "error",
    },
  };
}
