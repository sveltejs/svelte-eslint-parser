import { Context } from "../../../../src/context";
import { parseScript } from "../../../../src/parser/script";
import { parseTemplate } from "../../../../src/parser/template";
import { parseTypeScript } from "../../../../src/parser/typescript";
import { BASIC_PARSER_OPTIONS, listupFixtures } from "../test-utils";
import { assertResult } from "./assert-result";

describe("Check for typescript analyze result.", () => {
  for (const { input, inputFileName, meetRequirements } of listupFixtures()) {
    if (!input.includes('lang="ts"')) {
      continue;
    }
    describe(inputFileName, () => {
      const parserOptions = {
        ...BASIC_PARSER_OPTIONS,
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
      };

      const ctx = new Context(input, parserOptions);
      parseTemplate(ctx.sourceCode.template, ctx, parserOptions);

      const scripts = ctx.sourceCode.scripts;
      const code = scripts.getCurrentVirtualCodeInfo();
      const attrs = scripts.attrs;

      it("results other than type information should match before and after analysis.", () => {
        if (!meetRequirements("test")) {
          return;
        }
        const analyzedResult = parseTypeScript(code, attrs, parserOptions);
        const result = parseScript(
          code.script + code.render,
          attrs,
          parserOptions
        );
        const info = {
          code: code.script + code.render,
          virtualScriptCode: analyzedResult._virtualScriptCode,
        };

        assertResult(result.ast, analyzedResult.ast, info);
        assertResult(result.scopeManager, analyzedResult.scopeManager!, info);
      });
    });
  }
});
