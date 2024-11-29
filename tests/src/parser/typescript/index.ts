import { Context } from "../../../../src/context/index.js";
import type { NormalizedParserOptions } from "../../../../src/parser/parser-options.js";
import { parseScriptInSvelte } from "../../../../src/parser/script.js";
import { compilerVersion } from "../../../../src/parser/svelte-version.js";
import { parseTemplate } from "../../../../src/parser/template.js";
import { parseTypeScriptInSvelte } from "../../../../src/parser/typescript/index.js";
import { generateParserOptions, listupFixtures } from "../test-utils.js";
import { assertResult } from "./assert-result.js";

describe("Check for typescript analyze result.", () => {
  for (const {
    input,
    inputFileName,
    config,
    meetRequirements,
  } of listupFixtures()) {
    if (!meetRequirements("parse")) {
      continue;
    }
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
            svelteParseContext: {
              runes: true,
              compilerVersion,
              svelteConfig: null,
            },
          },
        );
        const result = parseScriptInSvelte(
          code.script + code.render + code.rootScope,
          attrs,
          parserOptions,
        );
        const info = {
          code: code.script + code.render + code.rootScope,
          virtualScriptCode: analyzedResult._virtualScriptCode,
        };

        assertResult(result.ast, analyzedResult.ast, info);
        assertResult(result.scopeManager, analyzedResult.scopeManager!, info);
      });
    });
  }
});
