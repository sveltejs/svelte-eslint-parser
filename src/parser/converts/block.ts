import type * as SvAST from "../svelte-ast-types"
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
import { convertChildren } from "./element"
import { getWithLoc, indexOf, lastIndexOf } from "./common"

/** Get start index of block */
function startBlockIndex(code: string, endIndex: number): number {
    return lastIndexOf(
        code,
        (c, index) => {
            if (c !== "{") {
                return false
            }
            for (let next = index + 1; next < code.length; next++) {
                const nextC = code[next]
                if (!nextC.trim()) {
                    continue
                }
                return (
                    code.startsWith("#if", next) ||
                    code.startsWith(":else", next)
                )
            }
            return false
        },
        endIndex,
    )
}

/** Convert for IfBlock */
export function convertIfBlock(
    node: SvAST.IfBlock,
    parent: SvelteIfBlock["parent"],
    ctx: Context,
): SvelteIfBlock {
    // {#if expr} {:else} {/if}
    // {:else if expr} {/if}
    const nodeStart = node.elseif
        ? startBlockIndex(ctx.code, node.start - 1)
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

    ctx.scriptLet.nestIfBlock(node.expression, ifBlock, (es) => {
        ifBlock.expression = es
    })
    ifBlock.children.push(...convertChildren(node, ifBlock, ctx))
    ctx.scriptLet.closeScope()
    if (node.elseif) {
        const index = ctx.code.indexOf("if", nodeStart)
        ctx.addToken("MustacheKeyword", { start: index, end: index + 2 })
    }
    extractMustacheBlockTokens(ifBlock, ctx, { startOnly: node.elseif })

    if (!node.else) {
        return ifBlock
    }

    const elseStart = startBlockIndex(ctx.code, node.else.start - 1)

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

    let elseIfBlock: SvelteIfBlock | null = null
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
        ctx.scriptLet.nestBlock(elseBlock)
        elseBlock.children.push(...convertChildren(node.else, elseBlock, ctx))
        ctx.scriptLet.closeScope()
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

    let indexRange: null | { start: number; end: number } = null

    if (node.index) {
        const start = ctx.code.indexOf(node.index, getWithLoc(node.context).end)
        indexRange = {
            start,
            end: start + node.index.length,
        }
    }

    ctx.scriptLet.nestEachBlock(
        node.expression,
        node.context,
        indexRange,
        eachBlock,
        (expression, context, index) => {
            eachBlock.expression = expression
            eachBlock.context = context
            eachBlock.index = index
        },
    )

    const asStart = ctx.code.indexOf("as", getWithLoc(node.expression).end)
    ctx.addToken("Keyword", {
        start: asStart,
        end: asStart + 2,
    })

    if (node.key) {
        ctx.scriptLet.addExpression(node.key, eachBlock, null, (key) => {
            eachBlock.key = key
        })
    }
    eachBlock.children.push(...convertChildren(node, eachBlock, ctx))

    ctx.scriptLet.closeScope()
    extractMustacheBlockTokens(eachBlock, ctx)

    if (!node.else) {
        return eachBlock
    }

    const elseStart = startBlockIndex(ctx.code, node.else.start - 1)

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

    ctx.scriptLet.nestBlock(elseBlock)
    elseBlock.children.push(...convertChildren(node.else, elseBlock, ctx))
    ctx.scriptLet.closeScope()
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

    ctx.scriptLet.addExpression(
        node.expression,
        awaitBlock,
        null,
        (expression) => {
            awaitBlock.expression = expression
        },
    )

    if (!node.pending.skip) {
        const pendingBlock: SvelteAwaitPendingBlock = {
            type: "SvelteAwaitPendingBlock",
            children: [],
            parent: awaitBlock,
            ...ctx.getConvertLocation({
                start: awaitBlock.range[0],
                end: node.pending.end,
            }),
        }
        ctx.scriptLet.nestBlock(pendingBlock)
        pendingBlock.children.push(
            ...convertChildren(node.pending, pendingBlock, ctx),
        )
        awaitBlock.pending = pendingBlock
        ctx.scriptLet.closeScope()
    }
    if (!node.then.skip) {
        const thenStart = awaitBlock.pending ? node.then.start : node.start
        const thenBlock: SvelteAwaitThenBlock = {
            type: "SvelteAwaitThenBlock",
            value: null,
            children: [],
            parent: awaitBlock,
            ...ctx.getConvertLocation({
                start: thenStart,
                end: node.then.end,
            }),
        }
        if (node.value) {
            ctx.scriptLet.nestBlock(
                thenBlock,
                [node.value],
                [thenBlock],
                ([value]) => {
                    thenBlock.value = value
                },
                [
                    `Parameters<Parameters<(typeof ${ctx.getText(
                        node.expression,
                    )})["then"]>[0]>[0]`,
                ],
            )
        } else {
            ctx.scriptLet.nestBlock(thenBlock)
        }
        thenBlock.children.push(...convertChildren(node.then, thenBlock, ctx))
        if (awaitBlock.pending) {
            extractMustacheBlockTokens(thenBlock, ctx, { startOnly: true })
        } else {
            const thenIndex = ctx.code.indexOf(
                "then",
                getWithLoc(node.expression).end,
            )
            ctx.addToken("MustacheKeyword", {
                start: thenIndex,
                end: thenIndex + 4,
            })
        }
        awaitBlock.then = thenBlock
        ctx.scriptLet.closeScope()
    }
    if (!node.catch.skip) {
        const catchStart =
            awaitBlock.pending || awaitBlock.then
                ? node.catch.start
                : node.start
        const catchBlock: SvelteAwaitCatchBlock = {
            type: "SvelteAwaitCatchBlock",
            error: null,
            children: [],
            parent: awaitBlock,
            ...ctx.getConvertLocation({
                start: catchStart,
                end: node.catch.end,
            }),
        }

        if (node.error) {
            ctx.scriptLet.nestBlock(
                catchBlock,
                [node.error],
                [catchBlock],
                ([error]) => {
                    catchBlock.error = error
                },
                ["Error"],
            )
        } else {
            ctx.scriptLet.nestBlock(catchBlock)
        }
        catchBlock.children.push(
            ...convertChildren(node.catch, catchBlock, ctx),
        )
        if (awaitBlock.pending || awaitBlock.then) {
            extractMustacheBlockTokens(catchBlock, ctx, { startOnly: true })
        } else {
            const catchIndex = ctx.code.indexOf(
                "catch",
                getWithLoc(node.expression).end,
            )
            ctx.addToken("MustacheKeyword", {
                start: catchIndex,
                end: catchIndex + 5,
            })
        }
        awaitBlock.catch = catchBlock
        ctx.scriptLet.closeScope()
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

    ctx.scriptLet.addExpression(
        node.expression,
        keyBlock,
        null,
        (expression) => {
            keyBlock.expression = expression
        },
    )

    ctx.scriptLet.nestBlock(keyBlock)
    keyBlock.children.push(...convertChildren(node, keyBlock, ctx))
    ctx.scriptLet.closeScope()

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
