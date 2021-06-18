import type ESTree from "estree"
export type Range = [number, number]

export interface SourceLocation {
    start: Position
    end: Position
}
export interface Locations {
    loc: SourceLocation
    range: Range
}

interface BaseNode extends Locations {
    type: string
}

export interface Token extends BaseNode {
    type:
        | "Boolean"
        | "Null"
        | "Identifier"
        | "Keyword"
        | "Punctuator"
        | "JSXIdentifier"
        | "JSXText"
        | "Numeric"
        | "String"
        | "RegularExpression"
        | "Template"
        // HTML
        | "HTMLText"
        | "HTMLIdentifier"
        | "MustacheKeyword"
        | "HTMLComment"
    value: string
}

export interface Comment extends BaseNode {
    type: "Line" | "Block"
    value: string
}

export interface Position {
    /** >= 1 */
    line: number
    /** >= 0 */
    column: number
}

export type SvelteNode =
    | SvelteProgram
    | SvelteScriptElement
    | SvelteStyleElement
    | SvelteElement
    | SvelteStartTag
    | SvelteEndTag
    | SvelteName
    | SvelteMemberExpressionName
    | SvelteText
    | SvelteLiteral
    | SvelteMustacheTag
    | SvelteDebugTag
    | SvelteIfBlock
    | SvelteElseBlock
    | SvelteEachBlock
    | SvelteAwaitBlock
    | SvelteAwaitPendingBlock
    | SvelteAwaitThenBlock
    | SvelteAwaitCatchBlock
    | SvelteKeyBlock
    | SvelteAttribute
    | SvelteShorthandAttribute
    | SvelteSpreadAttribute
    | SvelteDirective
    | SvelteSpecialDirective
    | SvelteDirectiveKey
    | SvelteSpecialDirectiveKey
    | SvelteHTMLComment
    | SvelteReactiveStatement

/** Node of Svelte program root */
export interface SvelteProgram extends BaseNode {
    type: "Program"
    body: (SvelteScriptElement | SvelteStyleElement | Child)[]
    sourceType: "script" | "module"
    comments: Comment[]
    tokens: Token[]
    parent: null
}

/** Node of elements like HTML element. */
export type SvelteElement =
    | SvelteHTMLElement
    | SvelteComponentElement
    | SvelteSpecialElement
type BaseSvelteElement = BaseNode

/** Node of `<script>` element. */
export interface SvelteScriptElement extends BaseSvelteElement {
    type: "SvelteScriptElement"
    name: SvelteName
    startTag: SvelteStartTag
    body: ESTree.Program["body"]
    endTag: SvelteEndTag | null
    parent: SvelteProgram
}
/** Node of `<style>` element. */
export interface SvelteStyleElement extends BaseSvelteElement {
    type: "SvelteStyleElement"
    name: SvelteName
    startTag: SvelteStartTag
    children: [SvelteText]
    endTag: SvelteEndTag | null
    parent: SvelteProgram
}
/** Node of HTML element. */
export interface SvelteHTMLElement extends BaseSvelteElement {
    type: "SvelteElement"
    kind: "html"
    name: SvelteName
    startTag: SvelteStartTag
    children: Child[]
    endTag: SvelteEndTag | null
    parent:
        | SvelteProgram
        | SvelteElement
        | SvelteIfBlock
        | SvelteElseBlock
        | SvelteEachBlock
        | SvelteAwaitPendingBlock
        | SvelteAwaitThenBlock
        | SvelteAwaitCatchBlock
        | SvelteKeyBlock
}
/** Node of Svelte component element. */
export interface SvelteComponentElement extends BaseSvelteElement {
    type: "SvelteElement"
    kind: "component"
    name: ESTree.Identifier | SvelteMemberExpressionName
    startTag: SvelteStartTag
    children: Child[]
    endTag: SvelteEndTag | null
    parent:
        | SvelteProgram
        | SvelteElement
        | SvelteIfBlock
        | SvelteElseBlock
        | SvelteEachBlock
        | SvelteAwaitPendingBlock
        | SvelteAwaitThenBlock
        | SvelteAwaitCatchBlock
        | SvelteKeyBlock
}
/** Node of Svelte special component element. e.g. `<svelte:window>` */
export interface SvelteSpecialElement extends BaseSvelteElement {
    type: "SvelteElement"
    kind: "special"
    name: SvelteName
    startTag: SvelteStartTag
    children: Child[]
    endTag: SvelteEndTag | null
    parent:
        | SvelteProgram
        | SvelteElement
        | SvelteIfBlock
        | SvelteElseBlock
        | SvelteEachBlock
        | SvelteAwaitPendingBlock
        | SvelteAwaitThenBlock
        | SvelteAwaitCatchBlock
        | SvelteKeyBlock
}
/** Node of start tag. */
export interface SvelteStartTag extends BaseNode {
    type: "SvelteStartTag"
    attributes: (
        | SvelteAttribute
        | SvelteShorthandAttribute
        | SvelteSpreadAttribute
        | SvelteDirective
        | SvelteSpecialDirective
    )[]
    selfClosing: boolean
    parent: SvelteElement | SvelteScriptElement | SvelteStyleElement
}
/** Node of end tag. */
export interface SvelteEndTag extends BaseNode {
    type: "SvelteEndTag"
    parent: SvelteElement | SvelteScriptElement | SvelteStyleElement
}

/** Node of names. It is used for element names other than components and normal attribute names. */
export interface SvelteName extends BaseNode {
    type: "SvelteName"
    name: string
    parent:
        | SvelteElement
        | SvelteScriptElement
        | SvelteStyleElement
        | SvelteAttribute
        | SvelteMemberExpressionName
}

/** Nodes that may be used in component names. The component names separated by dots. */
export interface SvelteMemberExpressionName extends BaseNode {
    type: "SvelteMemberExpressionName"
    object: SvelteMemberExpressionName | ESTree.Identifier
    property: SvelteName
    parent: SvelteComponentElement
}

type Child =
    | SvelteElement
    | SvelteText
    | SvelteMustacheTag
    | SvelteDebugTag
    | SvelteIfBlock
    | SvelteEachBlock
    | SvelteAwaitBlock
    | SvelteKeyBlock
    | SvelteHTMLComment

/** Node of text. like HTML text. */
export interface SvelteText extends BaseNode {
    type: "SvelteText"
    value: string
    parent:
        | SvelteProgram
        | SvelteElement
        | SvelteStyleElement
        | SvelteIfBlock
        | SvelteElseBlock
        | SvelteEachBlock
        | SvelteAwaitPendingBlock
        | SvelteAwaitThenBlock
        | SvelteAwaitCatchBlock
        | SvelteKeyBlock
}
/** Node of literal. */
export interface SvelteLiteral extends BaseNode {
    type: "SvelteLiteral"
    value: string
    parent: SvelteAttribute
}

interface BaseSvelteMustacheTag extends BaseNode {
    parent:
        | SvelteProgram
        | SvelteElement
        | SvelteIfBlock
        | SvelteElseBlock
        | SvelteEachBlock
        | SvelteAwaitPendingBlock
        | SvelteAwaitThenBlock
        | SvelteAwaitCatchBlock
        | SvelteKeyBlock
        | SvelteAttribute
}
/** Node of mustache tag. e.g. `{...}`, `{@html ...}`. Like JSXExpressionContainer */
export interface SvelteMustacheTag extends BaseSvelteMustacheTag {
    type: "SvelteMustacheTag"
    kind: "text" | "raw"
    expression: ESTree.Expression
}
/** Node of debug mustache tag. e.g. `{@debug}` */
export interface SvelteDebugTag extends BaseSvelteMustacheTag {
    type: "SvelteDebugTag"
    identifiers: ESTree.Identifier[]
}
/** Node of if block. e.g. `{#if}` */
export interface SvelteIfBlock extends BaseNode {
    type: "SvelteIfBlock"
    elseif: boolean
    expression: ESTree.Expression
    children: Child[]
    else: SvelteElseBlock | null
    parent:
        | SvelteProgram
        | SvelteElement
        | SvelteIfBlock
        | SvelteElseBlock
        | SvelteEachBlock
        | SvelteAwaitPendingBlock
        | SvelteAwaitThenBlock
        | SvelteAwaitCatchBlock
        | SvelteKeyBlock
}
/** Node of else block. e.g. `{:else}` */
export interface SvelteElseBlock extends BaseNode {
    type: "SvelteElseBlock"
    children: Child[]
    parent: SvelteIfBlock | SvelteEachBlock
}
/** Node of each block. e.g. `{#each}` */
export interface SvelteEachBlock extends BaseNode {
    type: "SvelteEachBlock"
    expression: ESTree.Expression
    context: ESTree.Pattern
    index: ESTree.Identifier | null
    key: ESTree.Expression | null
    children: Child[]
    else: SvelteElseBlock | null
    parent:
        | SvelteProgram
        | SvelteElement
        | SvelteIfBlock
        | SvelteElseBlock
        | SvelteEachBlock
        | SvelteAwaitPendingBlock
        | SvelteAwaitThenBlock
        | SvelteAwaitCatchBlock
        | SvelteKeyBlock
}
/** Node of await block. e.g. `{#await}` */
export interface SvelteAwaitBlock extends BaseNode {
    type: "SvelteAwaitBlock"
    expression: ESTree.Expression
    pending: SvelteAwaitPendingBlock | null
    then: SvelteAwaitThenBlock | null
    catch: SvelteAwaitCatchBlock | null
    parent:
        | SvelteProgram
        | SvelteElement
        | SvelteIfBlock
        | SvelteElseBlock
        | SvelteEachBlock
        | SvelteAwaitPendingBlock
        | SvelteAwaitThenBlock
        | SvelteAwaitCatchBlock
        | SvelteKeyBlock
}
/** Node of await pending block. e.g. `{#await expr} ... {:then}` */
export interface SvelteAwaitPendingBlock extends BaseNode {
    type: "SvelteAwaitPendingBlock"
    children: Child[]
    parent: SvelteAwaitBlock
}
/** Node of await then block. e.g. `{:then}` */
export interface SvelteAwaitThenBlock extends BaseNode {
    type: "SvelteAwaitThenBlock"
    value: ESTree.Pattern | null
    children: Child[]
    parent: SvelteAwaitBlock
}
/** Node of await catch block. e.g. `{:catch}` */
export interface SvelteAwaitCatchBlock extends BaseNode {
    type: "SvelteAwaitCatchBlock"
    error: ESTree.Pattern | null
    children: Child[]
    parent: SvelteAwaitBlock
}
/** Node of key block. e.g. `{#key}` */
export interface SvelteKeyBlock extends BaseNode {
    type: "SvelteKeyBlock"
    expression: ESTree.Expression
    children: Child[]
    parent:
        | SvelteProgram
        | SvelteElement
        | SvelteIfBlock
        | SvelteElseBlock
        | SvelteEachBlock
        | SvelteAwaitPendingBlock
        | SvelteAwaitThenBlock
        | SvelteAwaitCatchBlock
        | SvelteKeyBlock
}
/** Node of HTML comment. */
export interface SvelteHTMLComment extends BaseNode {
    type: "SvelteHTMLComment"
    value: string
    parent:
        | SvelteProgram
        | SvelteElement
        | SvelteIfBlock
        | SvelteElseBlock
        | SvelteEachBlock
        | SvelteAwaitPendingBlock
        | SvelteAwaitThenBlock
        | SvelteAwaitCatchBlock
        | SvelteKeyBlock
}
/** Node of HTML attribute. */
export interface SvelteAttribute extends BaseNode {
    type: "SvelteAttribute"
    key: SvelteName
    boolean: boolean
    value: (SvelteLiteral | (SvelteMustacheTag & { kind: "text" }))[]
    parent: SvelteStartTag
}
/** Node of shorthand attribute. e.g. `<img {src}>` */
export interface SvelteShorthandAttribute extends BaseNode {
    type: "SvelteShorthandAttribute"
    key: ESTree.Identifier
    value: ESTree.Identifier
    parent: SvelteStartTag
}
/** Node of spread attribute. e.g. `<Info {...pkg}/>`. Like JSXSpreadAttribute */
export interface SvelteSpreadAttribute extends BaseNode {
    type: "SvelteSpreadAttribute"
    argument: ESTree.Expression
    parent: SvelteStartTag
}

/** Node of directive. e.g. `<input bind:value />` */
export type SvelteDirective =
    | SvelteActionDirective
    | SvelteAnimationDirective
    | SvelteBindingDirective
    | SvelteClassDirective
    | SvelteEventHandlerDirective
    | SvelteLetDirective
    | SvelteRefDirective
    | SvelteTransitionDirective
export interface SvelteDirectiveKey extends BaseNode {
    type: "SvelteDirectiveKey"
    name: ESTree.Identifier
    modifiers: string[]
    parent: SvelteDirective
}

interface BaseSvelteDirective extends BaseNode {
    type: "SvelteDirective"
    key: SvelteDirectiveKey
    parent: SvelteStartTag
}

export interface SvelteActionDirective extends BaseSvelteDirective {
    kind: "Action"
    expression: null | ESTree.Expression
}
export interface SvelteAnimationDirective extends BaseSvelteDirective {
    kind: "Animation"
    expression: null | ESTree.Expression
}
export interface SvelteBindingDirective extends BaseSvelteDirective {
    kind: "Binding"
    expression: null | ESTree.Expression
}
export interface SvelteClassDirective extends BaseSvelteDirective {
    kind: "Class"
    expression: null | ESTree.Expression
}
export interface SvelteEventHandlerDirective extends BaseSvelteDirective {
    kind: "EventHandler"
    expression: null | ESTree.Expression
}
export interface SvelteLetDirective extends BaseSvelteDirective {
    kind: "Let"
    expression: null | ESTree.Pattern
}
export interface SvelteRefDirective extends BaseSvelteDirective {
    kind: "Ref"
    expression: null | ESTree.Expression
}
export interface SvelteTransitionDirective extends BaseSvelteDirective {
    kind: "Transition"
    intro: boolean
    outro: boolean
    expression: null | ESTree.Expression
}
export interface SvelteSpecialDirectiveKey extends BaseNode {
    type: "SvelteSpecialDirectiveKey"
    parent: SvelteSpecialDirective
}
export interface SvelteSpecialDirective extends BaseNode {
    type: "SvelteSpecialDirective"
    kind: "this"
    key: SvelteSpecialDirectiveKey
    expression: ESTree.Expression
    parent: SvelteStartTag /* & { parent: SvelteSpecialElement } */
}

/** Node of `$` statement. */
export interface SvelteReactiveStatement extends BaseNode {
    type: "SvelteReactiveStatement"
    label: ESTree.Identifier & { name: "$" }
    body: ESTree.Statement
    parent: ESTree.Node
}
