import { Context } from "../context/index.js";
import { resolveSvelteConfigFromOption } from "../svelte-config/index.js";
import type { NormalizedParserOptions } from "./parser-options.js";
import { parseTemplate } from "./template.js";
import { analyzeTypeScriptInSvelte } from "./typescript/analyze/index.js";
import { resolveSvelteParseContextForSvelte } from "./svelte-parse-context.js";

/**
 * Translate a Svelte component to the virtual TypeScript shim that the rest
 * of `parseTypeScriptInSvelte` would hand to `@typescript-eslint/parser`.
 *
 * Pulled out so the `ts.sys.readFile` hook can produce the same shim on
 * demand, without going through ESLint's parse entry point.
 *
 * Returns `null` if:
 *   - parsing fails for any reason, or
 *   - the file has no `<script lang="ts">` block (nothing to type-check).
 */
export function svelteToVirtualTypeScript(
  filePath: string,
  content: string,
  parserOptions: NormalizedParserOptions,
): string | null {
  try {
    // Strip `project` / `projectService` from the inner options. We are
    // already running inside `@typescript-eslint/parser`'s call stack via the
    // `ts.sys` hook; if we left them in, the inner analyzer would try to
    // initialise its own program and either deadlock or recurse forever.
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
      { slots: ctx.slots, svelteParseContext },
    );
    return tsCtx.script;
  } catch {
    return null;
  }
}
