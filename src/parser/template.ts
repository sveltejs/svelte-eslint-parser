import type {} from "svelte"; // FIXME: Workaround to get type information for "svelte/compiler"
import { parse } from "svelte/compiler";
import * as Compiler from "svelte/compiler";
import type * as SvAST from "./svelte-ast-types";
import type { Context } from "../context";
import { convertSvelteRoot } from "./converts/index";
import { sortNodes } from "./sort";
import type { SvelteProgram } from "../ast";
import { ParseError } from "..";
import type { NormalizedParserOptions } from "./parser-options";
import { svelteVersion } from "./svelte-version";

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
    const svelteAst = parse(code, {
      filename: parserOptions.filePath,
      ...(svelteVersion.gte(5) ? { modern: true } : {}),
    }) as never as Compiler.Root | SvAST.AstLegacy;
    const ast = convertSvelteRoot(svelteAst, ctx);
    sortNodes(ast.body);

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
