import type { SvelteLiteral, SvelteText } from "../../ast"
import type { Context } from "../../context"
import type * as SvAST from "../svelte-ast-types"
/** Convert for Text */
export function convertText(
    node: SvAST.Text,
    parent: SvelteText["parent"],
    ctx: Context,
): SvelteText {
    const text: SvelteText = {
        type: "SvelteText",
        value: node.data,
        parent,
        ...ctx.getConvertLocation(node),
    }
    let start = node.start
    let word = false
    for (let index = node.start; index < node.end; index++) {
        if (word !== Boolean(ctx.code[index].trim())) {
            if (start < index) {
                ctx.addToken("HTMLText", { start, end: index })
            }
            word = !word
            start = index
        }
    }
    if (start < node.end) {
        ctx.addToken("HTMLText", { start, end: node.end })
    }
    return text
}

/** Convert for Text to Literal */
export function convertTextToLiteral(
    node: SvAST.Text,
    parent: SvelteLiteral["parent"],
    ctx: Context,
): SvelteLiteral {
    const text: SvelteLiteral = {
        type: "SvelteLiteral",
        value: node.data,
        parent,
        ...ctx.getConvertLocation(node),
    }
    let start = node.start
    let word = false
    for (let index = node.start; index < node.end; index++) {
        if (word !== Boolean(ctx.code[index].trim())) {
            if (start < index) {
                ctx.addToken("HTMLText", { start, end: index })
            }
            word = !word
            start = index
        }
    }
    if (start < node.end) {
        ctx.addToken("HTMLText", { start, end: node.end })
    }
    return text
}
