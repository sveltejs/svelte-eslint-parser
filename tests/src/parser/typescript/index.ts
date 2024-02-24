import { Context } from "../../../../src/context";
import type { NormalizedParserOptions } from "../../../../src/parser/parser-options";
import { parseScriptInSvelte } from "../../../../src/parser/script";
import { parseTemplate } from "../../../../src/parser/template";
import { parseTypeScriptInSvelte } from "../../../../src/parser/typescript";
import { generateParserOptions, listupFixtures } from "../test-utils";
import { assertResult } from "./assert-result";

describe("Check for typescript analyze result.", () => {
  for (const {
    input,
    inputFileName,
    config,
    meetRequirements,
  } of listupFixtures()) {
    if (!input.includes('lang="ts"')) {
      continue;
    }
    describe(inputFileName, () => {
      const parserOptions = generateParserOptions(config, {
        ecmaVersion: 2020,
        sourceType: "module",
        loc: true,
        range: true,
        raw: true,
        tokens: true,
        comment: true,
        eslintVisitorKeys: true,
        eslintScopeManager: true,
        filePath: inputFileName,
      } as NormalizedParserOptions);
      const ctx = new Context(input, parserOptions);
      parseTemplate(ctx.sourceCode.template, ctx, parserOptions);

      const scripts = ctx.sourceCode.scripts;
      const code = scripts.getCurrentVirtualCodeInfo();
      const attrs = scripts.attrs;

      it("results other than type information should match before and after analysis.", () => {
        if (!meetRequirements("test")) {
          return;
        }
        const analyzedResult = parseTypeScriptInSvelte(
          code,
          attrs,
          parserOptions,
          {
            slots: new Set(),
          },
        );
        const result = parseScriptInSvelte(
          code.script + code.render + code.generics,
          attrs,
          parserOptions,
        );
        const info = {
          code: code.script + code.render + code.generics,
          virtualScriptCode: analyzedResult._virtualScriptCode,
        };

        assertResult(result.ast, analyzedResult.ast, info);
        assertResult(result.scopeManager, analyzedResult.scopeManager!, info);
      });
    });
  }
});
