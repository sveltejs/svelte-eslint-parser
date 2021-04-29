import type { SourceCode } from "eslint"
import { unionWith } from "eslint-visitor-keys"
import type { SvelteNode } from "./ast"

type SvelteKeysType<T extends SvelteNode = SvelteNode> = {
    [key in SvelteNode["type"]]: T extends { type: key }
        ? KeyofObject<T>[]
        : never
}
type KeyofObject<T> = { [key in keyof T]: key }[keyof T]

const svelteKeys: SvelteKeysType = {
    Program: ["body"],
    SvelteScriptElement: ["attributes", "body"],
    SvelteStyleElement: ["attributes", "children"],
    SvelteElement: ["name", "attributes", "children"],
    SvelteName: [],
    SvelteMustacheTag: ["expression"],
    SvelteDebugTag: ["identifiers"],
    SvelteIfBlock: ["expression", "children", "else"],
    SvelteElseBlock: ["children"],
    SvelteEachBlock: [
        "expression",
        "context",
        "index",
        "key",
        "children",
        "else",
    ],
    SvelteAwaitBlock: ["expression", "pending", "then", "catch"],
    SvelteAwaitPendingBlock: ["children"],
    SvelteAwaitThenBlock: ["value", "children"],
    SvelteAwaitCatchBlock: ["error", "children"],
    SvelteKeyBlock: ["expression", "children"],
    SvelteAttribute: ["key", "value"],
    SvelteShorthandAttribute: ["key", "value"],
    SvelteSpreadAttribute: ["expression"],
    SvelteDirective: ["expression"],
    SvelteReactiveStatement: ["label", "body"],
    SvelteText: [],
    SvelteHTMLComment: [],
}

export const KEYS: SourceCode.VisitorKeys = unionWith(
    svelteKeys,
) as SourceCode.VisitorKeys
