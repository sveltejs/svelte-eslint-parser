import type {} from "svelte"; // FIXME: Workaround to get type information for "svelte/compiler"
import { parse } from "svelte/compiler";
import type * as Compiler from "./svelte-ast-types-for-v5.js";
import type * as SvAST from "./svelte-ast-types.js";
import type { Context } from "../context/index.js";
import { convertSvelteRoot } from "./converts/index.js";
import type { SvelteProgram } from "../ast/index.js";
import { ParseError } from "../errors.js";
import type { NormalizedParserOptions } from "./parser-options.js";
import { svelteVersion } from "./svelte-version.js";

/**
 * Parse for template
 */
export function parseTemplate(
  code: string,
  ctx: Context,
  parserOptions: NormalizedParserOptions,
): {
  ast: SvelteProgram;
  svelteAst: Compiler.Root | SvAST.AstLegacy;
} {
  try {
    const options: {
      filename?: string | undefined;
      modern: true;
    } = {
      filename: parserOptions.filePath,
      ...(svelteVersion.gte(5) ? { modern: true } : ({} as never)),
    };
    const svelteAst = parse(code, options) as never as
      | Compiler.Root
      | SvAST.AstLegacy;
    const ast = convertSvelteRoot(svelteAst, ctx);

    return {
      ast,
      svelteAst,
    };
  } catch (e: any) {
    if (typeof e.pos === "number") {
      const err = new ParseError(e.message, e.pos, ctx);
      (err as any).svelteCompilerError = e;
      throw err;
    }
    throw e;
  }
}
