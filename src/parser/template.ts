import { parse } from "svelte/compiler"
import type * as SvAST from "./svelte-ast-types"
import type { Context } from "../context"
import { convertSvelteRoot } from "./converts/index"
import { sort } from "./sort"
import type { SvelteProgram } from "../ast"

/**
 * Parse for template
 */
export function parseTemplate(
    code: string,
    ctx: Context,
    parserOptions: any = {},
): {
    ast: SvelteProgram
    svelteAst: SvAST.Ast
} {
    const svelteAst = parse(code, {
        filename: parserOptions.filePath,
    }) as SvAST.Ast
    const ast = convertSvelteRoot(svelteAst, ctx)
    sort(ast.body)

    return {
        ast,
        svelteAst,
    }
}
