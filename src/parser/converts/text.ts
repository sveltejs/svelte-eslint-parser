import type { SvelteText } from "../../ast"
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
    ctx.addToken("HTMLText", node)
    return text
}
