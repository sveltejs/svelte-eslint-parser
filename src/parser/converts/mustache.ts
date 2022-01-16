import type {
    SvelteDebugTag,
    SvelteHtmlTag,
    SvelteMustacheTag,
} from "../../ast"
import type { Context } from "../../context"
import type * as SvAST from "../svelte-ast-types"
/** Convert for MustacheTag */
export function convertMustacheTag(
    node: SvAST.MustacheTag,
    parent: SvelteMustacheTag["parent"],
    ctx: Context,
): SvelteMustacheTag {
    const mustache: SvelteMustacheTag = {
        type: "SvelteMustacheTag",
        expression: null as any,
        parent,
        ...ctx.getConvertLocation(node),
    }
    ctx.scriptLet.addExpression(node.expression, mustache, null, (es) => {
        mustache.expression = es
    })
    return mustache
}
/** Convert for HtmlTag */
export function convertRawMustacheTag(
    node: SvAST.RawMustacheTag,
    parent: SvelteMustacheTag["parent"],
    ctx: Context,
): SvelteHtmlTag {
    const mustache: SvelteHtmlTag = {
        type: "SvelteHtmlTag",
        expression: null as any,
        parent,
        ...ctx.getConvertLocation(node),
    }
    ctx.scriptLet.addExpression(node.expression, mustache, null, (es) => {
        mustache.expression = es
    })
    const atHtmlStart = ctx.code.indexOf("@html", mustache.range[0])
    ctx.addToken("MustacheKeyword", {
        start: atHtmlStart,
        end: atHtmlStart + 5,
    })
    return mustache
}

/** Convert for DebugTag */
export function convertDebugTag(
    node: SvAST.DebugTag,
    parent: SvelteDebugTag["parent"],
    ctx: Context,
): SvelteDebugTag {
    const mustache: SvelteDebugTag = {
        type: "SvelteDebugTag",
        identifiers: [],
        parent,
        ...ctx.getConvertLocation(node),
    }
    for (const id of node.identifiers) {
        ctx.scriptLet.addExpression(id, mustache, null, (es) => {
            mustache.identifiers.push(es)
        })
    }
    const atDebugStart = ctx.code.indexOf("@debug", mustache.range[0])
    ctx.addToken("MustacheKeyword", {
        start: atDebugStart,
        end: atDebugStart + 6,
    })
    return mustache
}
