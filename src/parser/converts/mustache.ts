import type { SvelteDebugTag, SvelteMustacheTag } from "../../ast"
import type { Context } from "../../context"
import type * as SvAST from "../svelte-ast-types"
/** Convert for MustacheTag */
export function convertMustacheTag(
    node: SvAST.MustacheTag,
    parent: SvelteMustacheTag["parent"],
    ctx: Context,
): SvelteMustacheTag & { kind: "text" } {
    return convertMustacheTag0(node, "text", parent, ctx)
}
/** Convert for MustacheTag */
export function convertRawMustacheTag(
    node: SvAST.RawMustacheTag,
    parent: SvelteMustacheTag["parent"],
    ctx: Context,
): SvelteMustacheTag & { kind: "raw" } {
    const mustache = convertMustacheTag0(node, "raw", parent, ctx)
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
    parent: SvelteMustacheTag["parent"],
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

/** Convert to MustacheTag */
function convertMustacheTag0<K extends SvelteMustacheTag["kind"]>(
    node: SvAST.MustacheTag | SvAST.RawMustacheTag,
    kind: K,
    parent: SvelteMustacheTag["parent"],
    ctx: Context,
): SvelteMustacheTag & { kind: K } {
    const mustache: SvelteMustacheTag & { kind: K } = {
        type: "SvelteMustacheTag",
        kind,
        expression: null as any,
        parent,
        ...ctx.getConvertLocation(node),
    }
    ctx.scriptLet.addExpression(node.expression, mustache, null, (es) => {
        mustache.expression = es
    })
    return mustache
}
