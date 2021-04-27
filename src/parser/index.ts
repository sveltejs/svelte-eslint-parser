import { KEYS } from "../visitor-keys"
import { Context } from "../context"
import type { Comment, SvelteProgram, Token } from "../ast"
import type { Program } from "estree"
import type { ScopeManager } from "eslint-scope"
import { Variable } from "eslint-scope"
import { parseScript } from "./script"
import type * as SvAST from "./svelte-ast-types"
import { sort } from "./sort"
import { parseTemplate } from "./template"
import { analyzeStoreScope } from "./analyze-scope"
import { ParseError } from "../errors"

export interface ESLintProgram extends Program {
    comments: Comment[]
    tokens: Token[]
}
/**
 * The parsing result of ESLint custom parsers.
 */
export interface ESLintExtendedProgram {
    ast: ESLintProgram
    services?: Record<string, any>
    visitorKeys?: { [type: string]: string[] }
    scopeManager?: ScopeManager
}
/**
 * Parse source code
 */
export function parseForESLint(
    code: string,
    options?: any,
): {
    ast: SvelteProgram
    services: Record<string, any> & {
        isSvelte: true
        getSvelteHtmlAst: () => SvAST.Fragment
    }
    visitorKeys: { [type: string]: string[] }
    scopeManager: ScopeManager
} {
    const parserOptions = {
        ecmaVersion: 2020,
        sourceType: "module",
        loc: true,
        range: true,
        raw: true,
        tokens: true,
        comment: true,
        eslintVisitorKeys: true,
        eslintScopeManager: true,
        ...(options || {}),
    }
    parserOptions.sourceType = "module"
    if (parserOptions.ecmaVersion <= 5 || parserOptions.ecmaVersion == null) {
        parserOptions.ecmaVersion = 2015
    }

    const ctx = new Context(code, parserOptions)

    const resultScript = parseScript(ctx.sourceCode.script, parserOptions)
    ctx.readyScopeManager(resultScript.scopeManager!)
    const resultTemplate = parseTemplate(
        ctx.sourceCode.svelte,
        ctx,
        parserOptions,
    )
    analyzeStoreScope(resultScript.scopeManager!)

    // Add $$xxx variable
    for (const $$name of ["$$slots", "$$props", "$$restProps"]) {
        const globalScope = resultScript.scopeManager!.globalScope
        const variable = new Variable()
        variable.name = $$name
        ;(variable as any).scope = globalScope
        globalScope.variables.push(variable)
        globalScope.set.set($$name, variable)
        globalScope.through = globalScope.through.filter((reference) => {
            if (reference.identifier.name === $$name) {
                // Links the variable and the reference.
                // And this reference is removed from `Scope#through`.
                reference.resolved = variable
                variable.references.push(reference)
                return false
            }
            return true
        })
    }

    const ast = resultTemplate.ast

    const statements = [...resultScript.ast.body]

    ast.comments.push(...resultScript.ast.comments)
    sort(ast.comments)
    ast.tokens.push(...resultScript.ast.tokens)
    sort(ast.tokens)
    ast.sourceType = resultScript.ast.sourceType

    for (const body of ast.body) {
        if (body.type === "SvelteScriptElement") {
            let statement = statements[0]
            while (
                statement &&
                body.range[0] <= statement.range![0] &&
                statement.range![1] <= body.range[1]
            ) {
                ;(statement as any).parent = body
                body.body.push(statement)
                statements.shift()
                statement = statements[0]
            }
        }
    }
    if (statements.length) {
        throw new ParseError(
            "The script is unterminated",
            statements[0].range![1],
            ctx,
        )
    }

    resultScript.ast = ast as any
    resultScript.services = Object.assign(resultScript.services || {}, {
        isSvelte: true,
        getSvelteHtmlAst() {
            return resultTemplate.svelteAst.html
        },
    })
    resultScript.visitorKeys = Object.assign({}, KEYS, resultScript.visitorKeys)

    return resultScript as any
}
