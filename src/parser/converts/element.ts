import type {
    SvelteAwaitBlock,
    SvelteAwaitCatchBlock,
    SvelteAwaitPendingBlock,
    SvelteAwaitThenBlock,
    SvelteComponentElement,
    SvelteDebugTag,
    SvelteEachBlock,
    SvelteElement,
    SvelteElseBlock,
    SvelteHTMLComment,
    SvelteHTMLElement,
    SvelteIfBlock,
    SvelteKeyBlock,
    SvelteMemberExpressionName,
    SvelteMustacheTag,
    SvelteName,
    SvelteProgram,
    SvelteScriptElement,
    SvelteSpecialDirective,
    SvelteSpecialElement,
    SvelteStyleElement,
    SvelteText,
} from "../../ast"
import type ESTree from "estree"
import type { Context } from "../../context"
import type * as SvAST from "../svelte-ast-types"

import {
    convertAwaitBlock,
    convertEachBlock,
    convertIfBlock,
    convertKeyBlock,
} from "./block"
import { indexOf } from "./common"
import {
    convertMustacheTag,
    convertDebugTag,
    convertRawMustacheTag,
} from "./mustache"
import { convertText } from "./text"
import { analyzeExpressionScope, convertESNode, getWithLoc } from "./es"
import { convertAttributes } from "./attr"

/* eslint-disable complexity -- X */
/** Convert for Fragment or Element or ... */
export function* convertChildren(
    /* eslint-enable complexity -- X */
    fragment: { children: SvAST.TemplateNode[] },
    parent:
        | SvelteProgram
        | SvelteElement
        | SvelteIfBlock
        | SvelteElseBlock
        | SvelteEachBlock
        | SvelteAwaitPendingBlock
        | SvelteAwaitThenBlock
        | SvelteAwaitCatchBlock
        | SvelteKeyBlock,
    ctx: Context,
): IterableIterator<
    | SvelteText
    | SvelteElement
    | SvelteMustacheTag
    | SvelteDebugTag
    | SvelteIfBlock
    | SvelteEachBlock
    | SvelteAwaitBlock
    | SvelteKeyBlock
    | SvelteHTMLComment
> {
    for (const child of fragment.children) {
        if (child.type === "Comment") {
            yield convertComment(child, parent, ctx)
            continue
        }
        if (child.type === "Text") {
            yield convertText(child, parent, ctx)
            continue
        }
        if (child.type === "Element") {
            yield convertHTMLElement(child, parent, ctx)
            continue
        }
        if (child.type === "InlineComponent") {
            if (child.name.includes(":")) {
                yield convertSpecialElement(child, parent, ctx)
            } else {
                yield convertComponentElement(child, parent, ctx)
            }
            continue
        }
        if (child.type === "Slot") {
            yield convertSlotElement(child, parent, ctx)
            continue
        }
        if (child.type === "MustacheTag") {
            yield convertMustacheTag(child, parent, ctx)
            continue
        }
        if (child.type === "RawMustacheTag") {
            yield convertRawMustacheTag(child, parent, ctx)
            continue
        }
        if (child.type === "IfBlock") {
            // {#if expr} {/if}
            yield convertIfBlock(child, parent, ctx)
            continue
        }
        if (child.type === "EachBlock") {
            // {#each expr as item, index (key)} {/each}
            yield convertEachBlock(child, parent, ctx)
            continue
        }
        if (child.type === "AwaitBlock") {
            // {#await promise} {:then number} {:catch error} {/await}
            yield convertAwaitBlock(child, parent, ctx)
            continue
        }
        if (child.type === "KeyBlock") {
            // {#key expression}...{/key}
            yield convertKeyBlock(child, parent, ctx)
            continue
        }
        if (child.type === "Window") {
            yield convertWindowElement(child, parent, ctx)
            continue
        }
        if (child.type === "Body") {
            yield convertBodyElement(child, parent, ctx)
            continue
        }
        if (child.type === "Head") {
            yield convertHeadElement(child, parent, ctx)
            continue
        }
        if (child.type === "Options") {
            yield convertOptionsElement(child, parent, ctx)
            continue
        }
        if (child.type === "SlotTemplate") {
            yield convertSlotTemplateElement(child, parent, ctx)
            continue
        }
        if (child.type === "DebugTag") {
            yield convertDebugTag(child, parent, ctx)
            continue
        }

        throw new Error(`Unknown type:${(child as any).type}`)
    }
}

/** Convert for HTML Comment */
function convertComment(
    node: SvAST.Comment,
    parent: SvelteHTMLComment["parent"],
    ctx: Context,
): SvelteHTMLComment {
    const comment: SvelteHTMLComment = {
        type: "SvelteHTMLComment",
        value: node.data,
        parent,
        ...ctx.getConvertLocation(node),
    }

    ctx.addToken("HTMLComment", node)

    return comment
}

/** Convert for HTMLElement */
function convertHTMLElement(
    node: SvAST.Element | SvAST.Slot,
    parent: SvelteHTMLElement["parent"],
    ctx: Context,
): SvelteHTMLElement {
    const element: SvelteHTMLElement = {
        type: "SvelteElement",
        kind: "html",
        name: null as any,
        attributes: [],
        children: [],
        parent,
        ...ctx.getConvertLocation(node),
    }
    element.attributes.push(...convertAttributes(node.attributes, element, ctx))
    element.children.push(...convertChildren(node, element, ctx))

    extractElementTokens(element, ctx, {
        buildNameNode: (openTokenRange) => {
            ctx.addToken("HTMLIdentifier", openTokenRange)
            const name: SvelteName = {
                type: "SvelteName",
                name: node.name,
                parent: element,
                ...ctx.getConvertLocation(openTokenRange),
            }
            return name
        },
    })

    return element
}

/** Convert for Special element. e.g. <svelte:self> */
function convertSpecialElement(
    node:
        | SvAST.InlineComponent
        | SvAST.Window
        | SvAST.Body
        | SvAST.Head
        | SvAST.Options
        | SvAST.SlotTemplate,
    parent: SvelteSpecialElement["parent"],
    ctx: Context,
): SvelteSpecialElement {
    const element: SvelteSpecialElement = {
        type: "SvelteElement",
        kind: "special",
        name: null as any,
        attributes: [],
        children: [],
        parent,
        ...ctx.getConvertLocation(node),
    }
    element.attributes.push(...convertAttributes(node.attributes, element, ctx))
    element.children.push(...convertChildren(node, element, ctx))

    if (
        node.type === "InlineComponent" &&
        node.expression &&
        node.name === "svelte:component"
    ) {
        const eqIndex = ctx.code.lastIndexOf(
            "=",
            getWithLoc(node.expression).start,
        )
        const startIndex = ctx.code.lastIndexOf("this", eqIndex)
        const closeIndex = ctx.code.indexOf(
            "}",
            getWithLoc(node.expression).end,
        )
        const endIndex = indexOf(
            ctx.code,
            (c) => c === ">" || !c.trim(),
            closeIndex,
        )
        const thisAttr: SvelteSpecialDirective = {
            type: "SvelteSpecialDirective",
            kind: "this",
            expression: null as any,
            parent: element,
            ...ctx.getConvertLocation({ start: startIndex, end: endIndex }),
        }
        ctx.addToken("HTMLIdentifier", {
            start: startIndex,
            end: eqIndex,
        })
        const es = convertESNode(node.expression, thisAttr, ctx)
        analyzeExpressionScope(es, ctx)
        thisAttr.expression = es
        element.attributes.push(thisAttr)
    }

    extractElementTokens(element, ctx, {
        buildNameNode: (openTokenRange) => {
            ctx.addToken("HTMLIdentifier", openTokenRange)
            const name: SvelteName = {
                type: "SvelteName",
                name: node.name,
                parent: element,
                ...ctx.getConvertLocation(openTokenRange),
            }
            return name
        },
    })

    return element
}

/** Convert for ComponentElement */
function convertComponentElement(
    node: SvAST.InlineComponent,
    parent: SvelteComponentElement["parent"],
    ctx: Context,
): SvelteComponentElement {
    const element: SvelteComponentElement = {
        type: "SvelteElement",
        kind: "component",
        name: null as any,
        attributes: [],
        children: [],
        parent,
        ...ctx.getConvertLocation(node),
    }
    element.attributes.push(...convertAttributes(node.attributes, element, ctx))
    element.children.push(...convertChildren(node, element, ctx))

    extractElementTokens(element, ctx, {
        buildNameNode: (openTokenRange) => {
            const chains = node.name.split(".")
            const id = chains.shift()!
            const idRange = {
                start: openTokenRange.start,
                end: openTokenRange.start + id.length,
            }
            ctx.addToken("Identifier", idRange)
            const identifier: ESTree.Identifier = {
                type: "Identifier",
                name: id,
                // @ts-expect-error -- ignore
                parent: element,
                ...ctx.getConvertLocation(idRange),
            }
            let object: SvelteComponentElement["name"] = identifier

            let start = idRange.end + 1
            for (const name of chains) {
                const range = { start, end: start + name.length }
                ctx.addToken("HTMLIdentifier", range)
                const men: SvelteMemberExpressionName = {
                    type: "SvelteMemberExpressionName",
                    object,
                    property: {
                        type: "SvelteName",
                        name,
                        parent: null as any,
                        ...ctx.getConvertLocation(range),
                    },
                    parent: element,
                    ...ctx.getConvertLocation({
                        start: openTokenRange.start,
                        end: range.end,
                    }),
                }
                men.property.parent = men
                ;(object as any).parent = men
                object = men
                start = range.end + 1
            }

            analyzeExpressionScope(identifier, ctx)
            return object
        },
    })
    return element
}

/** Convert for Slot */
function convertSlotElement(
    node: SvAST.Slot,
    parent: SvelteHTMLElement["parent"],
    ctx: Context,
): SvelteHTMLElement {
    // Slot translates to SvelteHTMLElement.
    return convertHTMLElement(node, parent, ctx)
}

/** Convert for window element. e.g. <svelte:window> */
function convertWindowElement(
    node: SvAST.Window,
    parent: SvelteSpecialElement["parent"],
    ctx: Context,
): SvelteSpecialElement {
    return convertSpecialElement(node, parent, ctx)
}

/** Convert for body element. e.g. <svelte:body> */
function convertBodyElement(
    node: SvAST.Body,
    parent: SvelteSpecialElement["parent"],
    ctx: Context,
): SvelteSpecialElement {
    return convertSpecialElement(node, parent, ctx)
}

/** Convert for head element. e.g. <svelte:head> */
function convertHeadElement(
    node: SvAST.Head,
    parent: SvelteSpecialElement["parent"],
    ctx: Context,
): SvelteSpecialElement {
    return convertSpecialElement(node, parent, ctx)
}

/** Convert for options element. e.g. <svelte:options> */
function convertOptionsElement(
    node: SvAST.Options,
    parent: SvelteSpecialElement["parent"],
    ctx: Context,
): SvelteSpecialElement {
    return convertSpecialElement(node, parent, ctx)
}

/** Convert for <svelte:fragment> element. */
function convertSlotTemplateElement(
    node: SvAST.SlotTemplate,
    parent: SvelteSpecialElement["parent"],
    ctx: Context,
): SvelteSpecialElement {
    return convertSpecialElement(node, parent, ctx)
}

/** Extract element block tokens */
export function extractElementTokens<
    E extends SvelteScriptElement | SvelteElement | SvelteStyleElement
>(
    element: E,
    ctx: Context,
    options: {
        buildNameNode: (openTokenRange: {
            start: number
            end: number
        }) => E["name"]
        extractAttribute?: boolean
    },
): void {
    const startTagNameEnd = indexOf(
        ctx.code,
        (c) => c === "/" || c === ">" || !c.trim(),
        element.range[0] + 1,
    )
    const openTokenRange = {
        start: element.range[0] + 1,
        end: startTagNameEnd,
    }

    element.name = options.buildNameNode(openTokenRange)

    if (ctx.code[element.range[1] - 1] !== ">") {
        // Have not end tag
        return
    }
    if (ctx.code[element.range[1] - 2] === "/") {
        // self close
        return
    }

    const attrEnd = element.attributes.length
        ? element.attributes[element.attributes.length - 1].range[1]
        : openTokenRange.end

    const endTagOpen = ctx.code.lastIndexOf("<", element.range[1] - 1)
    if (endTagOpen <= attrEnd) {
        // void element
        return
    }
    const endTagNameStart = endTagOpen + 2
    const endTagNameEnd = indexOf(
        ctx.code,
        (c) => c === ">" || !c.trim(),
        endTagNameStart,
    )
    ctx.addToken("HTMLIdentifier", {
        start: endTagNameStart,
        end: endTagNameEnd,
    })
}
