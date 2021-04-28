import type ESTree from "estree"
import type { Nullable } from "./utils/type-util"
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
    | SvelteName
    | SvelteText
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
    | SvelteSpreadAttribute
    | SvelteDirective
    | SvelteReactiveStatement

export interface SvelteProgram extends BaseNode {
    type: "Program"
    body: (SvelteScriptElement | SvelteStyleElement | Child)[]
    sourceType: "script" | "module"
    comments: Comment[]
    tokens: Token[]
    parent: null
}

type BaseSvelteElement = BaseNode

export interface SvelteScriptElement extends BaseSvelteElement {
    type: "SvelteScriptElement"
    name: SvelteName
    attributes: (SvelteAttribute | SvelteSpreadAttribute | SvelteDirective)[]
    body: ESTree.Program["body"]
    parent: SvelteProgram
}
export interface SvelteStyleElement extends BaseSvelteElement {
    type: "SvelteStyleElement"
    name: SvelteName
    attributes: (SvelteAttribute | SvelteSpreadAttribute | SvelteDirective)[]
    children: [SvelteText]
    parent: SvelteProgram
}
export interface SvelteHtmlElement extends BaseSvelteElement {
    type: "SvelteElement"
    kind: "html"
    name: SvelteName
    attributes: (SvelteAttribute | SvelteSpreadAttribute | SvelteDirective)[]
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
export interface SvelteComponentElement extends BaseSvelteElement {
    type: "SvelteElement"
    kind: "component"
    name: ESTree.Identifier
    attributes: (SvelteAttribute | SvelteSpreadAttribute | SvelteDirective)[]
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
export interface SvelteSpecialElement extends BaseSvelteElement {
    type: "SvelteElement"
    kind: "special"
    name: SvelteName
    attributes: (
        | SvelteAttribute
        | SvelteSpreadAttribute
        | SvelteDirective
        | SvelteSpecialDirective
    )[]
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
export type SvelteElement =
    | SvelteHtmlElement
    | SvelteComponentElement
    | SvelteSpecialElement

export interface SvelteName extends BaseNode {
    type: "SvelteName"
    name: string
    parent: SvelteElement | SvelteScriptElement | SvelteStyleElement
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

export interface SvelteText extends BaseNode {
    type: "SvelteText"
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
        | SvelteAttribute
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
export interface SvelteMustacheTag extends BaseSvelteMustacheTag {
    type: "SvelteMustacheTag"
    kind: "text" | "raw"
    expression: ESTree.Expression
}
export interface SvelteDebugTag extends BaseSvelteMustacheTag {
    type: "SvelteDebugTag"
    identifiers: ESTree.Identifier[]
}
export interface SvelteIfBlock extends BaseNode {
    type: "SvelteIfBlock"
    elseif: boolean
    expression: ESTree.Expression
    children: Child[]
    else: Nullable<SvelteElseBlock>
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
export interface SvelteElseBlock extends BaseNode {
    type: "SvelteElseBlock"
    children: Child[]
    parent: SvelteIfBlock | SvelteEachBlock
}
export interface SvelteEachBlock extends BaseNode {
    type: "SvelteEachBlock"
    expression: ESTree.Expression
    context: ESTree.Pattern
    index: Nullable<ESTree.Identifier>
    key: Nullable<ESTree.Expression>
    children: Child[]
    else: Nullable<SvelteElseBlock>
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
export interface SvelteAwaitBlock extends BaseNode {
    type: "SvelteAwaitBlock"
    expression: ESTree.Expression
    pending: Nullable<SvelteAwaitPendingBlock>
    then: Nullable<SvelteAwaitThenBlock>
    catch: Nullable<SvelteAwaitCatchBlock>
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
export interface SvelteAwaitPendingBlock extends BaseNode {
    type: "SvelteAwaitPendingBlock"
    children: Child[]
    parent: SvelteAwaitBlock
}
export interface SvelteAwaitThenBlock extends BaseNode {
    type: "SvelteAwaitThenBlock"
    value: ESTree.Pattern
    children: Child[]
    parent: SvelteAwaitBlock
}
export interface SvelteAwaitCatchBlock extends BaseNode {
    type: "SvelteAwaitCatchBlock"
    error: ESTree.Pattern
    children: Child[]
    parent: SvelteAwaitBlock
}
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

export interface SvelteAttributeNonShorthand extends BaseNode {
    type: "SvelteAttribute"
    key: ESTree.Identifier
    shorthand: false
    boolean: boolean
    value: (SvelteText | (SvelteMustacheTag & { kind: "text" }))[]
    parent: SvelteElement | SvelteScriptElement | SvelteStyleElement
}
export interface SvelteAttributeShorthand extends BaseNode {
    type: "SvelteAttribute"
    key: ESTree.Identifier
    shorthand: true
    boolean: boolean
    value: [ESTree.Identifier]
    parent: SvelteElement | SvelteScriptElement | SvelteStyleElement
}
export type SvelteAttribute =
    | SvelteAttributeNonShorthand
    | SvelteAttributeShorthand
export interface SvelteSpreadAttribute extends BaseNode {
    type: "SvelteSpreadAttribute"
    expression: ESTree.Expression
    parent: SvelteElement | SvelteScriptElement | SvelteStyleElement
}

interface BaseSvelteDirective extends BaseNode {
    type: "SvelteDirective"
    name: ESTree.Identifier
    modifiers: string[]
    parent: SvelteElement | SvelteScriptElement | SvelteStyleElement
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
export interface SvelteSpecialDirective extends BaseNode {
    type: "SvelteSpecialDirective"
    kind: "this"
    expression: ESTree.Expression
    parent: SvelteSpecialElement
}

export type SvelteDirective =
    | SvelteActionDirective
    | SvelteAnimationDirective
    | SvelteBindingDirective
    | SvelteClassDirective
    | SvelteEventHandlerDirective
    | SvelteLetDirective
    | SvelteRefDirective
    | SvelteTransitionDirective

export interface SvelteReactiveStatement extends BaseNode {
    type: "SvelteReactiveStatement"
    label: ESTree.Identifier & { name: "$" }
    body: ESTree.Statement
    parent: ESTree.Node
}
