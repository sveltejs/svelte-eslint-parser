import assert from "assert";
import { createRequire } from "module";
import os from "os";
import path from "path";
import * as tsParser from "@typescript-eslint/parser";
import { parser as tseslintParser } from "typescript-eslint";
import { isTSESLintParserObject } from "../../../src/parser/parser-object.js";
import {
  isTypeScript,
  normalizeParserOptions,
} from "../../../src/parser/parser-options.js";

// The typescript-estree instance that `@typescript-eslint/parser` uses.
const require = createRequire(import.meta.url);
const tsESTree = createRequire(require.resolve("@typescript-eslint/parser"))(
  "@typescript-eslint/typescript-estree",
) as {
  addCandidateTSConfigRootDir: (candidate: string) => void;
  clearCandidateTSConfigRootDirs: () => void;
};

describe("Detection of @typescript-eslint/parser", () => {
  describe("with multiple candidate tsconfigRootDirs", () => {
    // typescript-eslint registers a candidate for each `eslint.config.*` file
    // that uses its configs, e.g. the root and package configs of a monorepo.
    before(() => {
      tsESTree.addCandidateTSConfigRootDir(path.join(os.tmpdir(), "root"));
      tsESTree.addCandidateTSConfigRootDir(path.join(os.tmpdir(), "package"));
      assert.throws(
        () => tsParser.parseForESLint("", {}),
        /multiple candidate TSConfigRootDirs/u,
      );
    });
    after(() => {
      tsESTree.clearCandidateTSConfigRootDirs();
    });

    for (const [name, parser] of [
      ["@typescript-eslint/parser", tsParser],
      ["the parser of typescript-eslint", tseslintParser],
      [
        "a parser that wraps @typescript-eslint/parser",
        { parseForESLint: tsParser.parseForESLint },
      ],
    ] as const) {
      it(`detects ${name}`, () => {
        assert.strictEqual(isTSESLintParserObject(parser), true);
        assert.strictEqual(
          isTypeScript(normalizeParserOptions({ parser }), "ts"),
          true,
        );
      });
    }
  });
});
