import type {
    SvelteActionDirective,
    SvelteAnimationDirective,
    SvelteAttribute,
    SvelteShorthandAttribute,
    SvelteBindingDirective,
    SvelteClassDirective,
    SvelteDirective,
    SvelteEventHandlerDirective,
    SvelteLetDirective,
    SvelteSpreadAttribute,
    SvelteTransitionDirective,
    SvelteStartTag,
    SvelteName,
} from "../../ast"
import type ESTree from "estree"
import type { Context } from "../../context"
import type * as SvAST from "../svelte-ast-types"
import { getWithLoc, indexOf } from "./common"
import { convertMustacheTag } from "./mustache"
import { convertTextToLiteral } from "./text"
import { ParseError } from "../../errors"
import type { ScriptLetCallback } from "../../context/script-let"

/** Convert for Attributes */
export function* convertAttributes(
    attributes: SvAST.AttributeOrDirective[],
    parent: SvelteStartTag,
    ctx: Context,
): IterableIterator<
    | SvelteAttribute
    | SvelteShorthandAttribute
    | SvelteSpreadAttribute
    | SvelteDirective
> {
    for (const attr of attributes) {
        if (attr.type === "Attribute") {
            yield convertAttribute(attr, parent, ctx)
            continue
        }
        if (attr.type === "Spread") {
            yield convertSpreadAttribute(attr, parent, ctx)
            continue
        }
        if (attr.type === "Binding") {
            yield convertBindingDirective(attr, parent, ctx)
            continue
        }
        if (attr.type === "EventHandler") {
            yield convertEventHandlerDirective(attr, parent, ctx)
            continue
        }
        if (attr.type === "Class") {
            yield convertClassDirective(attr, parent, ctx)
            continue
        }
        if (attr.type === "Transition") {
            yield convertTransitionDirective(attr, parent, ctx)
            continue
        }
        if (attr.type === "Animation") {
            yield convertAnimationDirective(attr, parent, ctx)
            continue
        }
        if (attr.type === "Action") {
            yield convertActionDirective(attr, parent, ctx)
            continue
        }
        if (attr.type === "Let") {
            yield convertLetDirective(attr, parent, ctx)
            continue
        }
        if (attr.type === "Ref") {
            throw new ParseError("Ref are not supported.", attr.start, ctx)
        }
        throw new ParseError(
            `Unknown directive or attribute (${attr.type}) are not supported.`,
            attr.start,
            ctx,
        )
    }
}

/** Convert for Attribute */
function convertAttribute(
    node: SvAST.Attribute,
    parent: SvelteAttribute["parent"],
    ctx: Context,
): SvelteAttribute | SvelteShorthandAttribute {
    const attribute: SvelteAttribute = {
        type: "SvelteAttribute",
        boolean: false,
        key: null as any,
        value: [],
        parent,
        ...ctx.getConvertLocation(node),
    }
    const keyStart = ctx.code.indexOf(node.name, node.start)
    const keyRange = { start: keyStart, end: keyStart + node.name.length }
    attribute.key = {
        type: "SvelteName",
        name: node.name,
        parent: attribute,
        ...ctx.getConvertLocation(keyRange),
    }
    if (node.value === true) {
        // Boolean attribute
        attribute.boolean = true
        ctx.addToken("HTMLIdentifier", keyRange)
        return attribute
    }
    for (let index = 0; index < node.value.length; index++) {
        const v = node.value[index]
        if (v.type === "AttributeShorthand") {
            const key: ESTree.Identifier = {
                ...attribute.key,
                type: "Identifier",
            }
            const sAttr: SvelteShorthandAttribute = {
                type: "SvelteShorthandAttribute",
                key,
                value: key,
                parent,
                loc: attribute.loc,
                range: attribute.range,
            }
            ;(key as any).parent = sAttr
            ctx.scriptLet.addExpression(key, sAttr, null, (es) => {
                sAttr.value = es
            })
            return sAttr
        }
        if (v.type === "Text") {
            const next = node.value[index + 1]
            if (next && next.start < v.end) {
                // Maybe bug in Svelte can cause the completion index to shift.
                // console.log(ctx.getText(v), v.data)
                v.end = next.start
            }
            attribute.value.push(convertTextToLiteral(v, attribute, ctx))
            continue
        }
        if (v.type === "MustacheTag") {
            const mustache = convertMustacheTag(v, attribute, ctx)
            attribute.value.push(mustache)
            continue
        }
        const u: any = v
        throw new ParseError(
            `Unknown attribute value (${u.type}) are not supported.`,
            u.start,
            ctx,
        )
    }

    // Not required for shorthands. Therefore, register the token here.
    ctx.addToken("HTMLIdentifier", keyRange)

    return attribute
}

/** Convert for Spread */
function convertSpreadAttribute(
    node: SvAST.Spread,
    parent: SvelteSpreadAttribute["parent"],
    ctx: Context,
): SvelteSpreadAttribute {
    const attribute: SvelteSpreadAttribute = {
        type: "SvelteSpreadAttribute",
        argument: null as any,
        parent,
        ...ctx.getConvertLocation(node),
    }

    const spreadStart = ctx.code.indexOf("...", node.start)
    ctx.addToken("Punctuator", {
        start: spreadStart,
        end: spreadStart + 3,
    })

    ctx.scriptLet.addExpression(node.expression, attribute, null, (es) => {
        attribute.argument = es
    })

    return attribute
}

/** Convert for Binding Directive */
function convertBindingDirective(
    node: SvAST.DirectiveForExpression,
    parent: SvelteDirective["parent"],
    ctx: Context,
): SvelteBindingDirective {
    const directive: SvelteBindingDirective = {
        type: "SvelteDirective",
        kind: "Binding",
        key: null as any,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    processDirective(node, directive, ctx, (expression) => {
        return ctx.scriptLet.addExpression(
            expression,
            directive,
            null,
            (es, { getInnermostScope }) => {
                directive.expression = es
                const scope = getInnermostScope(es)
                const reference = scope.references.find(
                    (ref) => ref.identifier === es,
                )
                if (reference) {
                    // The bind directive does read and write.
                    reference.isWrite = () => true
                    reference.isWriteOnly = () => false
                    reference.isReadWrite = () => true
                    reference.isReadOnly = () => false
                    reference.isRead = () => true
                }
            },
        )
    })
    return directive
}

/** Convert for EventHandler Directive */
function convertEventHandlerDirective(
    node: SvAST.DirectiveForExpression,
    parent: SvelteDirective["parent"],
    ctx: Context,
): SvelteEventHandlerDirective {
    const directive: SvelteEventHandlerDirective = {
        type: "SvelteDirective",
        kind: "EventHandler",
        key: null as any,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    const isCustomEvent =
        parent.parent.type === "SvelteElement" &&
        (parent.parent.kind === "component" || parent.parent.kind === "special")
    processDirective(
        node,
        directive,
        ctx,
        buildProcessExpressionForExpression(
            directive,
            ctx,
            isCustomEvent
                ? "(e:CustomEvent<any>)=>void"
                : `(e:HTMLElementEventMap['${node.name}'])=>void`,
        ),
    )
    return directive
}

/** Convert for Class Directive */
function convertClassDirective(
    node: SvAST.DirectiveForExpression,
    parent: SvelteDirective["parent"],
    ctx: Context,
): SvelteClassDirective {
    const directive: SvelteClassDirective = {
        type: "SvelteDirective",
        kind: "Class",
        key: null as any,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    processDirective(
        node,
        directive,
        ctx,
        buildProcessExpressionForExpression(directive, ctx, null),
    )
    return directive
}

/** Convert for Transition Directive */
function convertTransitionDirective(
    node: SvAST.TransitionDirective,
    parent: SvelteDirective["parent"],
    ctx: Context,
): SvelteTransitionDirective {
    const directive: SvelteTransitionDirective = {
        type: "SvelteDirective",
        kind: "Transition",
        intro: node.intro,
        outro: node.outro,
        key: null as any,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    processDirective(
        node,
        directive,
        ctx,
        buildProcessExpressionForExpression(directive, ctx, null),
        (name) => ctx.scriptLet.addExpression(name, directive.key),
    )
    return directive
}

/** Convert for Animation Directive */
function convertAnimationDirective(
    node: SvAST.DirectiveForExpression,
    parent: SvelteDirective["parent"],
    ctx: Context,
): SvelteAnimationDirective {
    const directive: SvelteAnimationDirective = {
        type: "SvelteDirective",
        kind: "Animation",
        key: null as any,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    processDirective(
        node,
        directive,
        ctx,
        buildProcessExpressionForExpression(directive, ctx, null),
        (name) => ctx.scriptLet.addExpression(name, directive.key),
    )
    return directive
}

/** Convert for Action Directive */
function convertActionDirective(
    node: SvAST.DirectiveForExpression,
    parent: SvelteDirective["parent"],
    ctx: Context,
): SvelteActionDirective {
    const directive: SvelteActionDirective = {
        type: "SvelteDirective",
        kind: "Action",
        key: null as any,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    processDirective(
        node,
        directive,
        ctx,
        buildProcessExpressionForExpression(directive, ctx, null),
        (name) => ctx.scriptLet.addExpression(name, directive.key),
    )
    return directive
}

/** Convert for Let Directive */
function convertLetDirective(
    node: SvAST.LetDirective,
    parent: SvelteLetDirective["parent"],
    ctx: Context,
): SvelteLetDirective {
    const directive: SvelteLetDirective = {
        type: "SvelteDirective",
        kind: "Let",
        key: null as any,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    processDirective(
        node,
        directive,
        ctx,
        (pattern) => {
            return ctx.letDirCollections
                .getCollection()
                .addPattern(pattern, directive, "any")
        },
        node.expression
            ? undefined
            : (name) => {
                  // shorthand
                  ctx.letDirCollections
                      .getCollection()
                      .addPattern(name, directive, "any", (es) => {
                          directive.expression = es
                      })
                  return []
              },
    )
    return directive
}

/** Common process for directive */
function processDirective<
    D extends SvAST.Directive,
    S extends SvelteDirective,
    E extends D["expression"] & S["expression"],
>(
    node: D & { expression: null | E },
    directive: S,
    ctx: Context,
    processExpression: (
        expression: E,
        shorthand: boolean,
    ) => ScriptLetCallback<NonNullable<E>>[],
    processName?: (
        expression: SvelteName,
    ) => ScriptLetCallback<ESTree.Identifier>[],
) {
    const colonIndex = ctx.code.indexOf(":", directive.range[0])
    ctx.addToken("HTMLIdentifier", {
        start: directive.range[0],
        end: colonIndex,
    })
    const nameIndex = ctx.code.indexOf(node.name, colonIndex + 1)
    const nameRange = {
        start: nameIndex,
        end: nameIndex + node.name.length,
    }

    let keyEndIndex = nameRange.end

    // modifiers
    if (ctx.code[nameRange.end] === "|") {
        let nextStart = nameRange.end + 1
        let nextEnd = indexOf(
            ctx.code,
            (c) =>
                c === "=" || c === ">" || c === "/" || c === "|" || !c.trim(),
            nextStart,
        )
        ctx.addToken("HTMLIdentifier", { start: nextStart, end: nextEnd })
        while (ctx.code[nextEnd] === "|") {
            nextStart = nextEnd + 1
            nextEnd = indexOf(
                ctx.code,
                (c) =>
                    c === "=" ||
                    c === ">" ||
                    c === "/" ||
                    c === "|" ||
                    !c.trim(),
                nextStart,
            )
            ctx.addToken("HTMLIdentifier", { start: nextStart, end: nextEnd })
        }
        keyEndIndex = nextEnd
    }

    let isShorthandExpression = false

    if (node.expression) {
        isShorthandExpression =
            node.expression.type === "Identifier" &&
            node.expression.name === node.name &&
            getWithLoc(node.expression).start === nameRange.start
        if (
            isShorthandExpression &&
            getWithLoc(node.expression).end !== nameRange.end
        ) {
            // The identifier location may be incorrect in some edge cases.
            // e.g. bind:value=""
            getWithLoc(node.expression).end = nameRange.end
        }
        processExpression(node.expression, isShorthandExpression).push((es) => {
            directive.expression = es
        })
    }

    const key = (directive.key = {
        type: "SvelteDirectiveKey",
        name: null as any,
        modifiers: node.modifiers,
        parent: directive,
        ...ctx.getConvertLocation({ start: node.start, end: keyEndIndex }),
    })

    // put name
    key.name = {
        type: "SvelteName",
        name: node.name,
        parent: key,
        ...ctx.getConvertLocation(nameRange),
    }
    if (!isShorthandExpression) {
        if (processName) {
            processName(key.name).push((es) => {
                key.name = es
            })
        } else {
            ctx.addToken("HTMLIdentifier", nameRange)
        }
    }
}

/** Build processExpression for Expression */
function buildProcessExpressionForExpression(
    directive: SvelteDirective & { expression: null | ESTree.Expression },
    ctx: Context,
    typing: string | null,
): (expression: ESTree.Expression) => ScriptLetCallback<ESTree.Expression>[] {
    return (expression) => {
        return ctx.scriptLet.addExpression(expression, directive, typing)
    }
}
