import type { SourceCode } from "eslint"
import { unionWith } from "eslint-visitor-keys"
import type { SvelteNode } from "./ast"

const svelteKeys: { [key in SvelteNode["type"]]: string[] } = {
    Program: ["body"],
    SvelteScriptElement: ["attributes", "body"],
    SvelteStyleElement: ["attributes", "children"],
    SvelteElement: ["name", "attributes", "children"],
    SvelteName: [],
    SvelteMustacheTag: ["expression"],
    SvelteDebugTag: ["identifiers"],
    SvelteIfBlock: ["expression", "children", "else"],
    SvelteElseBlock: ["expression", "children"],
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
    SvelteSpreadAttribute: ["expression"],
    SvelteDirective: ["expression"],
    SvelteReactiveStatement: ["label", "body"],
    SvelteText: [],
}

export const KEYS: SourceCode.VisitorKeys = unionWith(
    svelteKeys,
) as SourceCode.VisitorKeys
