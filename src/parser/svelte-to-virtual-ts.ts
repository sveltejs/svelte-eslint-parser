import { Context } from "../context/index.js";
import { resolveSvelteConfigFromOption } from "../svelte-config/index.js";
import type { NormalizedParserOptions } from "./parser-options.js";
import { parseTemplate } from "./template.js";
import { analyzeTypeScriptInSvelte } from "./typescript/analyze/index.js";
import { resolveSvelteParseContextForSvelte } from "./svelte-parse-context.js";
import { getInstanceScriptRange } from "./compat.js";

/**
 * Translate a Svelte component to the virtual TypeScript shim. Returns
 * `null` if the file has no `<script lang="ts">` or parsing fails.
 */
export function svelteToVirtualTypeScript(
  filePath: string,
  content: string,
  parserOptions: NormalizedParserOptions,
): string | null {
  try {
    // Drop `project` / `projectService`: we're already inside
    // `@typescript-eslint/parser`'s stack via the `ts.sys` hook, and a nested
    // analyzer trying to spin up its own program would deadlock or recurse.
    const inner: NormalizedParserOptions = {
      ...parserOptions,
      filePath,
      project: null,
      projectService: undefined,
      EXPERIMENTAL_useProjectService: undefined,
    };

    const ctx = new Context(content, inner);
    if (!ctx.isTypeScript()) return null;

    const template = parseTemplate(ctx.sourceCode.template, ctx, inner);
    const svelteConfig = resolveSvelteConfigFromOption({
      ...parserOptions,
      filePath,
    });
    const svelteParseContext = resolveSvelteParseContextForSvelte(
      svelteConfig,
      inner,
      template.svelteAst,
    );

    const scripts = ctx.sourceCode.scripts;
    const tsCtx = analyzeTypeScriptInSvelte(
      scripts.getCurrentVirtualCodeInfo(),
      scripts.attrs,
      inner,
      {
        slots: ctx.slots,
        svelteParseContext,
        instanceScriptRange: getInstanceScriptRange(template.svelteAst),
      },
    );
    return tsCtx.script;
  } catch {
    return null;
  }
}
