import type * as SvAST from "../svelte-ast-types"
import { parse } from "svelte/compiler"
import type {
    SvelteName,
    SvelteProgram,
    SvelteScriptElement,
    SvelteStyleElement,
} from "../../ast"
import {} from "./common"
import type { Context } from "../../context"
import { convertChildren, extractElementTags } from "./element"
import { convertAttributes } from "./attr"

/**
 * Convert root
 */
export function convertSvelteRoot(
    svelteAst: SvAST.Ast,
    ctx: Context,
): SvelteProgram {
    const ast: SvelteProgram = {
        type: "Program",
        body: [],
        comments: ctx.comments,
        sourceType: "module",
        tokens: ctx.tokens,
        parent: null,
        ...ctx.getConvertLocation({ start: 0, end: ctx.code.length }),
    }
    const body = ast.body
    if (svelteAst.html) {
        const fragment = svelteAst.html
        body.push(...convertChildren(fragment, ast, ctx))
    }
    if (svelteAst.instance) {
        const instance = svelteAst.instance
        const script: SvelteScriptElement = {
            type: "SvelteScriptElement",
            name: null as any,
            startTag: null as any,
            body: [],
            endTag: null,
            parent: ast,
            ...ctx.getConvertLocation(instance),
        }
        extractAttributes(script, ctx)
        extractElementTags(script, ctx, {
            buildNameNode: (openTokenRange) => {
                ctx.addToken("HTMLIdentifier", openTokenRange)
                const name: SvelteName = {
                    type: "SvelteName",
                    name: "script",
                    parent: script,
                    ...ctx.getConvertLocation(openTokenRange),
                }
                return name
            },
        })
        body.push(script)
    }
    if (svelteAst.module) {
        const module = svelteAst.module
        const script: SvelteScriptElement = {
            type: "SvelteScriptElement",
            name: null as any,
            startTag: null as any,
            body: [],
            endTag: null,
            parent: ast,
            ...ctx.getConvertLocation(module),
        }
        extractAttributes(script, ctx)
        extractElementTags(script, ctx, {
            buildNameNode: (openTokenRange) => {
                ctx.addToken("HTMLIdentifier", openTokenRange)
                const name: SvelteName = {
                    type: "SvelteName",
                    name: "script",
                    parent: script,
                    ...ctx.getConvertLocation(openTokenRange),
                }
                return name
            },
        })
        body.push(script)
    }
    if (svelteAst.css) {
        const style: SvelteStyleElement = {
            type: "SvelteStyleElement",
            name: null as any,
            startTag: null as any,
            children: [] as any,
            endTag: null,
            parent: ast,
            ...ctx.getConvertLocation(svelteAst.css),
        }

        extractAttributes(style, ctx)
        extractElementTags(style, ctx, {
            buildNameNode: (openTokenRange) => {
                ctx.addToken("HTMLIdentifier", openTokenRange)
                const name: SvelteName = {
                    type: "SvelteName",
                    name: "style",
                    parent: style,
                    ...ctx.getConvertLocation(openTokenRange),
                }
                return name
            },
        })

        if (style.endTag && style.startTag.range[1] < style.endTag.range[0]) {
            const contentRange = {
                start: style.startTag.range[1],
                end: style.endTag.range[0],
            }
            ctx.addToken("HTMLText", contentRange)
            style.children = [
                {
                    type: "SvelteText",
                    value: ctx.code.slice(contentRange.start, contentRange.end),
                    parent: style,
                    ...ctx.getConvertLocation(contentRange),
                },
            ]
        }

        body.push(style)
    }

    return ast
}

/** Extract attrs */
function extractAttributes(
    element: SvelteScriptElement | SvelteStyleElement,
    ctx: Context,
) {
    const script = element.type === "SvelteScriptElement"
    const code =
        " ".repeat(element.range[0]) +
        ctx.sourceCode.template
            .slice(...element.range)
            .replace(
                script
                    ? /<script(\s[\s\S]*?)?>([\s\S]*?)<\/script>/giu
                    : /<style(\s[\s\S]*?)?>([\s\S]*?)<\/style>/giu,
                (_tag, attributes: string | undefined, context: string) =>
                    `${script ? "<div   " : "<div  "}${
                        attributes || ""
                    }>${" ".repeat(context.length)}</div>`,
            )
    const svelteAst = parse(code) as SvAST.Ast

    const fakeElement = svelteAst.html.children.find(
        (c) => c.type === "Element",
    ) as SvAST.Element

    element.startTag = {
        type: "SvelteStartTag",
        attributes: [],
        selfClosing: false,
        parent: element,
        range: [element.range[0], null as any],
        loc: {
            start: {
                line: element.loc.start.line,
                column: element.loc.start.column,
            },
            end: null as any,
        },
    }
    element.startTag.attributes.push(
        ...convertAttributes(fakeElement.attributes, element.startTag, ctx),
    )
}
