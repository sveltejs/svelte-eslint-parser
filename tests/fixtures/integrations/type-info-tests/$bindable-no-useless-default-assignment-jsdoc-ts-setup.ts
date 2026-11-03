import type { Linter } from "eslint";
import { generateParserOptions } from "../../../src/parser/test-utils";
import { plugin } from "typescript-eslint";
import * as parser from "../../../../src";
import globals from "globals";
import { propsTypeRule } from "./props-type-rule";

export function getConfig(): Linter.Config {
  return {
    plugins: {
      "@typescript-eslint": {
        rules: plugin.rules as any,
      },
      test: {
        rules: { "props-type": propsTypeRule },
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
      "@typescript-eslint/no-useless-default-assignment": "error",
      "test/props-type": "error",
    },
  };
}
