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
} from "../../ast"
import type ESTree from "estree"
import type { Context } from "../../context"
import type * as SvAST from "../svelte-ast-types"
import { indexOf } from "./common"
import {
    analyzeExpressionScope,
    analyzePatternScope,
    convertESNode,
    getWithLoc,
} from "./es"
import { convertMustacheTag } from "./mustache"
import { convertTextToLiteral } from "./text"
import { ParseError } from "../../errors"

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
    ctx.addToken("HTMLIdentifier", keyRange)
    if (node.value === true) {
        // Boolean attribute
        attribute.boolean = true
        return attribute
    }
    for (const v of node.value) {
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
            analyzeExpressionScope(sAttr.key, ctx)
            return sAttr
        }
        if (v.type === "Text") {
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

    const es = convertESNode(node.expression, attribute, ctx)!
    analyzeExpressionScope(es, ctx)
    attribute.argument = es

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
        name: null as any,
        modifiers: node.modifiers,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    processDirective(node, directive, ctx, (expression) => {
        const es = convertESNode(expression, directive, ctx)
        analyzeExpressionScope(es, ctx)

        const reference = ctx.templateScopeManager.currentScope.references.find(
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

        return es
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
        name: null as any,
        modifiers: node.modifiers,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    processDirective(
        node,
        directive,
        ctx,
        buildProcessExpressionForExpression(directive, ctx),
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
        name: null as any,
        modifiers: node.modifiers,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    processDirective(
        node,
        directive,
        ctx,
        buildProcessExpressionForExpression(directive, ctx),
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
        name: null as any,
        modifiers: node.modifiers,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    processDirective(
        node,
        directive,
        ctx,
        buildProcessExpressionForExpression(directive, ctx),
    )
    if (directive.expression !== directive.name) {
        // Transition name is reference
        analyzeExpressionScope(directive.name, ctx)
    }
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
        name: null as any,
        modifiers: node.modifiers,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    processDirective(
        node,
        directive,
        ctx,
        buildProcessExpressionForExpression(directive, ctx),
    )
    if (directive.expression !== directive.name) {
        // Animation name is reference
        analyzeExpressionScope(directive.name, ctx)
    }
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
        name: null as any,
        modifiers: node.modifiers,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    processDirective(
        node,
        directive,
        ctx,
        buildProcessExpressionForExpression(directive, ctx),
    )
    if (directive.expression !== directive.name) {
        // Action name is reference
        analyzeExpressionScope(directive.name, ctx)
    }
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
        name: null as any,
        modifiers: node.modifiers,
        expression: null,
        parent,
        ...ctx.getConvertLocation(node),
    }
    processDirective(node, directive, ctx, (pattern) => {
        const es = convertESNode(pattern, directive, ctx)
        analyzePatternScope(es, ctx)
        return es
    })
    if (!directive.expression) {
        // shorthand
        analyzePatternScope(directive.name, ctx)
        directive.expression = directive.name
    }
    return directive
}

/** Common process for directive */
function processDirective<
    D extends SvAST.Directive,
    S extends SvelteDirective,
    E extends D["expression"] & S["expression"]
>(
    node: D & { expression: null | E },
    directive: S,
    ctx: Context,
    processExpression: (expression: E) => E,
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

    // modifiers
    if (ctx.code[nameRange.end] === "|") {
        let nextStart = nameRange.end + 1
        let nextEnd = indexOf(
            ctx.code,
            (c) => c === "=" || c === ">" || c === "|" || !c.trim(),
            nextStart,
        )
        ctx.addToken("HTMLIdentifier", { start: nextStart, end: nextEnd })
        while (ctx.code[nextEnd] === "|") {
            nextStart = nextEnd + 1
            nextEnd = indexOf(
                ctx.code,
                (c) => c === "=" || c === ">" || c === "|" || !c.trim(),
                nextStart,
            )
            ctx.addToken("HTMLIdentifier", { start: nextStart, end: nextEnd })
        }
    }

    if (node.expression) {
        directive.expression = processExpression(node.expression)
    }

    // put name
    if (
        directive.expression?.type === "Identifier" &&
        directive.expression.name === node.name &&
        getWithLoc(directive.expression).start === nameRange.start &&
        getWithLoc(directive.expression).end === nameRange.end
    ) {
        // shorthand
        directive.name = directive.expression
    } else {
        directive.name = {
            type: "Identifier",
            name: node.name,
            // @ts-expect-error -- ignore
            parent: directive,
            ...ctx.getConvertLocation(nameRange),
        }
        ctx.addToken("HTMLIdentifier", nameRange)
    }
}

/** Build processExpression for Expression */
function buildProcessExpressionForExpression(
    directive: SvelteDirective & { expression: null | ESTree.Expression },
    ctx: Context,
): (expression: ESTree.Expression) => ESTree.Expression {
    return (expression) => {
        const es = convertESNode(expression, directive, ctx)
        analyzeExpressionScope(es, ctx)
        return es
    }
}
