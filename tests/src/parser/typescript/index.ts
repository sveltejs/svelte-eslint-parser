import { Context } from "../../../../src/context/index.js";
import type { NormalizedParserOptions } from "../../../../src/parser/parser-options.js";
import { parseScriptInSvelte } from "../../../../src/parser/script.js";
import { svelteVersion } from "../../../../src/parser/svelte-version.js";
import { getInstanceScriptRange } from "../../../../src/parser/compat.js";
import { resolveSvelteParseContextForSvelte } from "../../../../src/parser/svelte-parse-context.js";
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
        ecmaVersion: 2024,
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
      it("results other than type information should match before and after analysis.", () => {
        if (!meetRequirements("test")) {
          return;
        }
        assertAnalysisRestores(input, parserOptions);
      });
    });
  }
});

/** Compare the complete restored AST and scope graph against plain parsing. */
function assertAnalysisRestores(
  input: string,
  parserOptions: NormalizedParserOptions,
): void {
  const ctx = new Context(input, parserOptions);
  const template = parseTemplate(ctx.sourceCode.template, ctx, parserOptions);
  const scripts = ctx.sourceCode.scripts;
  const code = scripts.getCurrentVirtualCodeInfo();
  const analyzedResult = parseTypeScriptInSvelte(
    code,
    scripts.attrs,
    parserOptions,
    {
      slots: new Set(),
      instanceScriptRange: getInstanceScriptRange(template.svelteAst),
      svelteParseContext: resolveSvelteParseContextForSvelte(
        null,
        parserOptions,
        template.svelteAst,
      ),
    },
  );
  const result = parseScriptInSvelte(
    code.script + code.render + code.rootScope,
    scripts.attrs,
    parserOptions,
  );
  const info = {
    code: code.script + code.render + code.rootScope,
    virtualScriptCode: analyzedResult._virtualScriptCode,
  };
  assertResult(result.ast, analyzedResult.ast, info);
  assertResult(result.scopeManager, analyzedResult.scopeManager!, info);
}

describe("component export restore invariance", () => {
  const cases = [
    {
      name: "legacy inferred props",
      script: "export let enabled = true; export let count = 0; count++;",
    },
    {
      name: "copied type comments",
      script: "export let value: { /* original */ text: string };",
    },
    ...(svelteVersion.gte(5)
      ? [
          {
            name: "runes probe with nested scope and comments",
            script:
              "const seed = [1]; let { items = seed.map(item => /* original */ item + 1) } = $props();",
          },
          {
            name: "runes probe with shadowed helper names",
            script:
              "type Partial<T> = never; type Record = never; let { count = 0, ...rest } = $props();",
          },
        ]
      : []),
  ];
  for (const { name, script } of cases) {
    it(name, () => {
      assertAnalysisRestores(
        `<script lang="ts">${script}</script>`,
        generateParserOptions({
          project: null,
          filePath: "Component.svelte",
          parser: "@typescript-eslint/parser",
        } as NormalizedParserOptions),
      );
    });
  }
});
