import type {} from "svelte"; // FIXME: Workaround to get type information for "svelte/compiler"
import { parse } from "svelte/compiler";
import type * as SvAST from "./svelte-ast-types";
import type { Context } from "../context";
import { convertSvelteRoot } from "./converts/index";
import { sortNodes } from "./sort";
import type { SvelteProgram } from "../ast";
import { ParseError } from "..";

/**
 * Parse for template
 */
export function parseTemplate(
  code: string,
  ctx: Context,
  parserOptions: any = {},
): {
  ast: SvelteProgram;
  svelteAst: SvAST.Ast;
} {
  try {
    const svelteAst = parse(code, {
      filename: parserOptions.filePath,
    }) as never as SvAST.Ast;
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
