import type * as SvAST from "../svelte-ast-types"
import type ESTree from "estree"
import type {
    SvelteAwaitBlock,
    SvelteAwaitCatchBlock,
    SvelteAwaitPendingBlock,
    SvelteAwaitThenBlock,
    SvelteEachBlock,
    SvelteElseBlock,
    SvelteIfBlock,
    SvelteKeyBlock,
} from "../../ast"
import type { Context } from "../../context"
import {
    analyzeExpressionScope,
    analyzePatternScope,
    convertESNode,
} from "./es"
import { convertChildren } from "./element"
import { indexOf, lastIndexOf } from "./common"
import type { Nullable } from "../../utils/type-util"

/** Convert for IfBlock */
export function convertIfBlock(
    node: SvAST.IfBlock,
    parent: SvelteIfBlock["parent"],
    ctx: Context,
): SvelteIfBlock {
    // {#if expr} {:else} {/if}
    // {:else if expr} {/if}
    const nodeStart = node.elseif
        ? ctx.code.lastIndexOf("{", node.start)
        : node.start
    const ifBlock: SvelteIfBlock = {
        type: "SvelteIfBlock",
        elseif: Boolean(node.elseif),
        expression: null as any,
        children: [],
        else: null,
        parent,
        ...ctx.getConvertLocation({ start: nodeStart, end: node.end }),
    }
    const es = convertESNode(node.expression, ifBlock, ctx)!
    analyzeExpressionScope(es, ctx)
    ifBlock.expression = es

    ctx.templateScopeManager.nestBlockScope(ifBlock, "block")
    ifBlock.children.push(...convertChildren(node, ifBlock, ctx))
    ctx.templateScopeManager.closeScope()
    if (node.elseif) {
        const index = ctx.code.indexOf("if", nodeStart)
        ctx.addToken("MustacheKeyword", { start: index, end: index + 2 })
    }
    extractMustacheBlockTokens(ifBlock, ctx, { startOnly: node.elseif })

    if (!node.else) {
        return ifBlock
    }

    const elseStart = ctx.code.lastIndexOf("{", node.else.start)

    const elseBlock: SvelteElseBlock = {
        type: "SvelteElseBlock",
        children: [],
        parent: ifBlock,
        ...ctx.getConvertLocation({
            start: elseStart,
            end: node.else.end,
        }),
    }
    ifBlock.else = elseBlock

    let elseIfBlock: Nullable<SvelteIfBlock> = null
    if (node.else.children.length === 1) {
        const c = node.else.children[0]
        if (c.type === "IfBlock" && c.elseif) {
            elseIfBlock = convertIfBlock(c, elseBlock, ctx)
            // adjust loc
            elseBlock.range[1] = elseIfBlock.range[1]
            elseBlock.loc.end = {
                line: elseIfBlock.loc.end.line,
                column: elseIfBlock.loc.end.column,
            }
        }
    }

    if (elseIfBlock) {
        elseBlock.children.push(elseIfBlock)
    } else {
        ctx.templateScopeManager.nestBlockScope(elseBlock, "block")
        elseBlock.children.push(...convertChildren(node.else, elseBlock, ctx))
        ctx.templateScopeManager.closeScope()
        extractMustacheBlockTokens(elseBlock, ctx, { startOnly: true })
    }

    return ifBlock
}

/** Convert for EachBlock */
export function convertEachBlock(
    node: SvAST.EachBlock,
    parent: SvelteEachBlock["parent"],
    ctx: Context,
): SvelteEachBlock {
    // {#each expr as item, index (key)} {/each}
    const eachBlock: SvelteEachBlock = {
        type: "SvelteEachBlock",
        expression: null as any,
        context: null as any,
        index: null,
        key: null,
        children: [],
        else: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    ctx.templateScopeManager.nestBlockScope(eachBlock, "for")

    const expression = convertESNode(node.expression, eachBlock, ctx)!
    analyzeExpressionScope(expression, ctx)
    eachBlock.expression = expression
    const asStart = ctx.code.indexOf("as", eachBlock.expression.range![1])
    ctx.addToken("Keyword", {
        start: asStart,
        end: asStart + 2,
    })
    const context = convertESNode(node.context, eachBlock, ctx)!
    analyzePatternScope(context, ctx)
    eachBlock.context = context

    if (node.index) {
        const start = ctx.code.indexOf(
            node.index,
            (eachBlock.context as any).range![1],
        )
        const rangeData = {
            start,
            end: start + node.index.length,
        }
        const index: ESTree.Identifier = {
            type: "Identifier",
            name: node.index,
            // @ts-expect-error -- ignore
            parent: eachBlock,
            ...ctx.getConvertLocation(rangeData),
        }
        analyzePatternScope(index, ctx)
        eachBlock.index = index
        ctx.addToken("Identifier", rangeData)
    }
    if (node.key) {
        const key = convertESNode(node.key, eachBlock, ctx)!
        analyzeExpressionScope(key, ctx)
        eachBlock.key = key
    }
    eachBlock.children.push(...convertChildren(node, eachBlock, ctx))

    ctx.templateScopeManager.closeScope()
    extractMustacheBlockTokens(eachBlock, ctx)

    if (!node.else) {
        return eachBlock
    }

    const elseStart = ctx.code.lastIndexOf("{", node.else.start)

    const elseBlock: SvelteElseBlock = {
        type: "SvelteElseBlock",
        children: [],
        parent: eachBlock,
        ...ctx.getConvertLocation({
            start: elseStart,
            end: node.else.end,
        }),
    }
    eachBlock.else = elseBlock

    ctx.templateScopeManager.nestBlockScope(elseBlock, "block")
    elseBlock.children.push(...convertChildren(node.else, elseBlock, ctx))
    ctx.templateScopeManager.closeScope()
    extractMustacheBlockTokens(elseBlock, ctx, { startOnly: true })

    return eachBlock
}

/** Convert for AwaitBlock */
export function convertAwaitBlock(
    node: SvAST.AwaitBlock,
    parent: SvelteAwaitBlock["parent"],
    ctx: Context,
): SvelteAwaitBlock {
    const awaitBlock: SvelteAwaitBlock = {
        type: "SvelteAwaitBlock",
        expression: null as any,
        pending: null,
        then: null,
        catch: null,
        parent,
        ...ctx.getConvertLocation(node),
    }

    const expression = convertESNode(node.expression, awaitBlock, ctx)!
    analyzeExpressionScope(expression, ctx)
    awaitBlock.expression = expression

    if (!node.pending.skip) {
        const pendingBlock: SvelteAwaitPendingBlock = {
            type: "SvelteAwaitPendingBlock",
            children: [],
            parent: awaitBlock,
            ...ctx.getConvertLocation(node.pending),
        }
        ctx.templateScopeManager.nestBlockScope(pendingBlock, "block")
        pendingBlock.children.push(
            ...convertChildren(node.pending, pendingBlock, ctx),
        )
        awaitBlock.pending = pendingBlock
        ctx.templateScopeManager.closeScope()
    }
    if (!node.then.skip) {
        const thenStart = awaitBlock.pending ? node.then.start : node.start
        const thenBlock: SvelteAwaitThenBlock = {
            type: "SvelteAwaitThenBlock",
            value: null as any,
            children: [],
            parent: awaitBlock,
            ...ctx.getConvertLocation({
                start: thenStart,
                end: node.then.end,
            }),
        }

        ctx.templateScopeManager.nestBlockScope(thenBlock, "block")
        const value = convertESNode(node.value, thenBlock, ctx)!
        analyzePatternScope(value, ctx)
        thenBlock.value = value
        thenBlock.children.push(...convertChildren(node.then, thenBlock, ctx))
        if (awaitBlock.pending) {
            extractMustacheBlockTokens(thenBlock, ctx, { startOnly: true })
        } else {
            const thenIndex = ctx.code.indexOf("then", expression.range![1])
            ctx.addToken("MustacheKeyword", {
                start: thenIndex,
                end: thenIndex + 4,
            })
        }
        awaitBlock.then = thenBlock
        ctx.templateScopeManager.closeScope()
    }
    if (!node.catch.skip) {
        const catchStart =
            awaitBlock.pending || awaitBlock.then
                ? node.catch.start
                : node.start
        const catchBlock: SvelteAwaitCatchBlock = {
            type: "SvelteAwaitCatchBlock",
            error: null as any,
            children: [],
            parent: awaitBlock,
            ...ctx.getConvertLocation({
                start: catchStart,
                end: node.catch.end,
            }),
        }
        ctx.templateScopeManager.nestBlockScope(catchBlock, "catch")

        const error = convertESNode(node.error, catchBlock, ctx)!
        analyzePatternScope(error, ctx)
        catchBlock.error = error
        catchBlock.children.push(
            ...convertChildren(node.catch, catchBlock, ctx),
        )
        if (awaitBlock.pending || awaitBlock.then) {
            extractMustacheBlockTokens(catchBlock, ctx, { startOnly: true })
        } else {
            const catchIndex = ctx.code.indexOf("catch", expression.range![1])
            ctx.addToken("MustacheKeyword", {
                start: catchIndex,
                end: catchIndex + 5,
            })
        }
        awaitBlock.catch = catchBlock
        ctx.templateScopeManager.closeScope()
    }

    extractMustacheBlockTokens(awaitBlock, ctx)

    return awaitBlock
}

/** Convert for KeyBlock */
export function convertKeyBlock(
    node: SvAST.KeyBlock,
    parent: SvelteKeyBlock["parent"],
    ctx: Context,
): SvelteKeyBlock {
    const keyBlock: SvelteKeyBlock = {
        type: "SvelteKeyBlock",
        expression: null as any,
        children: [],
        parent,
        ...ctx.getConvertLocation(node),
    }

    const expression = convertESNode(node.expression, keyBlock, ctx)!
    analyzeExpressionScope(expression, ctx)
    keyBlock.expression = expression

    ctx.templateScopeManager.nestBlockScope(keyBlock, "block")
    keyBlock.children.push(...convertChildren(node, keyBlock, ctx))
    ctx.templateScopeManager.closeScope()

    extractMustacheBlockTokens(keyBlock, ctx)

    return keyBlock
}

/** Extract mustache block tokens */
function extractMustacheBlockTokens(
    node:
        | SvelteIfBlock
        | SvelteEachBlock
        | SvelteElseBlock
        | SvelteAwaitBlock
        | SvelteAwaitThenBlock
        | SvelteAwaitCatchBlock
        | SvelteKeyBlock,
    ctx: Context,
    option?: { startOnly?: true },
) {
    const startSectionNameStart = indexOf(
        ctx.code,
        (c) => Boolean(c.trim()),
        node.range[0] + 1,
    )
    const startSectionNameEnd = indexOf(
        ctx.code,
        (c) => c === "}" || !c.trim(),
        startSectionNameStart + 1,
    )
    ctx.addToken("MustacheKeyword", {
        start: startSectionNameStart,
        end: startSectionNameEnd,
    })

    if (option?.startOnly) {
        return
    }

    const endSectionNameEnd =
        lastIndexOf(ctx.code, (c) => Boolean(c.trim()), node.range[1] - 2) + 1
    const endSectionNameStart = lastIndexOf(
        ctx.code,
        (c) => c === "{" || c === "/" || !c.trim(),
        endSectionNameEnd - 1,
    )
    ctx.addToken("MustacheKeyword", {
        start: endSectionNameStart,
        end: endSectionNameEnd,
    })
}
