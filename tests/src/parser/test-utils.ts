import path from "path"
import fs from "fs"
import type { Linter, Scope as ESLintScope } from "eslint"
import { LinesAndColumns } from "../../../src/context"
import type { Reference, Scope, ScopeManager, Variable } from "eslint-scope"
import type { SvelteNode } from "../../../src/ast"

const AST_FIXTURE_ROOT = path.resolve(__dirname, "../../fixtures/parser/ast")
export const BASIC_PARSER_OPTIONS: Linter.BaseConfig<Linter.RulesRecord>["parserOptions"] =
    {
        ecmaVersion: 2020,
        parser: {
            ts: "@typescript-eslint/parser",
            typescript: require.resolve("@typescript-eslint/parser"),
        },
    }
export function* listupFixtures(): IterableIterator<{
    input: string
    inputFileName: string
    outputFileName: string
    scopeFileName: string
    getRuleOutputFileName: (ruleName: string) => string
}> {
    yield* listupFixturesImpl(AST_FIXTURE_ROOT)
}

function* listupFixturesImpl(dir: string): IterableIterator<{
    input: string
    inputFileName: string
    outputFileName: string
    scopeFileName: string
    getRuleOutputFileName: (ruleName: string) => string
}> {
    for (const filename of fs.readdirSync(dir)) {
        const inputFileName = path.join(dir, filename)
        if (filename.endsWith("input.svelte")) {
            const outputFileName = inputFileName.replace(
                /input\.svelte$/u,
                "output.json",
            )
            const scopeFileName = inputFileName.replace(
                /input\.svelte$/u,
                "scope-output.json",
            )

            const input = fs.readFileSync(inputFileName, "utf8")
            yield {
                input,
                inputFileName,
                outputFileName,
                scopeFileName,
                getRuleOutputFileName: (ruleName) => {
                    return inputFileName.replace(
                        /input\.svelte$/u,
                        `${ruleName}-result.json`,
                    )
                },
            }
        }
        if (
            fs.existsSync(inputFileName) &&
            fs.statSync(inputFileName).isDirectory()
        ) {
            yield* listupFixturesImpl(inputFileName)
        }
    }
}

export function getMessageData(
    code: string,
    message: Linter.LintMessage,
): {
    ruleId: string | null
    code: string
    message?: string
    line: number
    column: number
} {
    const linesAndColumns = new LinesAndColumns(code)
    const start = linesAndColumns.getIndexFromLoc({
        line: message.line,
        column: message.column - 1,
    })
    let end: number
    if (message.endLine != null) {
        end = linesAndColumns.getIndexFromLoc({
            line: message.endLine,
            column: message.endColumn! - 1,
        })
    } else {
        end = start + 1
    }
    if (message.ruleId == null) {
        return {
            ruleId: message.ruleId,
            message: message.message,
            code: code.slice(start, end),
            line: message.line,
            column: message.column,
        }
    }
    return {
        ruleId: message.ruleId,
        code: code.slice(start, end),
        line: message.line,
        column: message.column,
    }
}

export function scopeToJSON(scopeManager: ScopeManager): string {
    const scope = normalizeScope(scopeManager.globalScope)
    return JSON.stringify(scope, nodeReplacer, 2)
}

function normalizeScope(scope: Scope): any {
    return {
        type: scope.type,
        variables: scope.variables.map(normalizeVar),
        references: scope.references.map(normalizeReference),
        childScopes: scope.childScopes.map(normalizeScope),
        through: scope.through.map(normalizeReference),
    }
}

function normalizeVar(v: Variable) {
    return {
        name: v.name,
        identifiers: v.identifiers,
        defs: v.defs.map(normalizeDef),
        references: v.references.map(normalizeReference),
    }
}

function normalizeReference(reference: Reference) {
    return {
        identifier: reference.identifier,
        from: reference.from.type,
        resolved: reference.resolved?.defs?.[0]?.name ?? null,
        init: reference.init ?? null,
    }
}

function normalizeDef(reference: ESLintScope.Definition) {
    return {
        type: reference.type,
        node: reference.node,
        name: reference.name,
    }
}

/**
 * Remove `parent` properties from the given AST.
 */
export function nodeReplacer(key: string, value: any): any {
    if (key === "parent") {
        return undefined
    }
    if (value instanceof RegExp) {
        return String(value)
    }
    if (typeof value === "bigint") {
        return null // Make it null so it can be checked on node8.
        // return `${String(value)}n`
    }
    return normalizeObject(value)
}

type SvelteKeysType<T extends SvelteNode = SvelteNode> = {
    [key in SvelteNode["type"]]: T extends { type: key }
        ? KeyofObject<T>[]
        : never
}
type KeyofObject<T> = { [key in keyof T]: key }[keyof T]
const nodeToKeys: SvelteKeysType = {
    Program: ["body", "sourceType", "comments", "tokens"],
    SvelteAttribute: ["key", "boolean", "value"],
    SvelteAwaitBlock: ["expression", "pending", "then", "catch"],
    SvelteAwaitCatchBlock: ["error", "children"],
    SvelteAwaitPendingBlock: ["children"],
    SvelteAwaitThenBlock: ["value", "children"],
    SvelteDebugTag: ["identifiers"],
    SvelteDirective: ["name", "modifiers", "intro", "outro", "expression"],
    SvelteEachBlock: [
        "expression",
        "context",
        "index",
        "key",
        "children",
        "else",
    ],
    SvelteElement: ["kind", "name", "startTag", "children", "endTag"],
    SvelteElseBlock: ["children"],
    SvelteEndTag: [],
    SvelteHTMLComment: ["value"],
    SvelteIfBlock: ["elseif", "expression", "children", "else"],
    SvelteKeyBlock: ["expression", "children"],
    SvelteLiteral: ["value"],
    SvelteMustacheTag: ["kind", "expression"],
    SvelteName: ["name"],
    SvelteReactiveStatement: ["label", "body"],
    SvelteScriptElement: ["name", "startTag", "body", "endTag"],
    SvelteShorthandAttribute: ["key", "value"],
    SvelteSpecialDirective: ["kind", "expression"],
    SvelteSpreadAttribute: ["argument"],
    SvelteStartTag: ["attributes", "selfClosing"],
    SvelteStyleElement: ["name", "startTag", "children", "endTag"],
    SvelteText: ["value"],
}

function normalizeObject(value: any) {
    if (!value || typeof value !== "object" || Array.isArray(value)) {
        return value
    }
    const isNode =
        typeof value.type === "string" &&
        (typeof value.start === "number" ||
            typeof value.range?.[0] === "number")

    function firsts(k: string, nodeType: string | null) {
        const o = [
            "type",
            "kind",
            "name",
            ...((nodeType != null &&
                nodeToKeys[nodeType as keyof SvelteKeysType]) ||
                []),
            // scope
            "identifier",
            "from",
            "variables",
            "identifiers",
            "defs",
            "references",
            "childScopes",
        ].indexOf(k)

        return o === -1 ? Infinity : o
    }

    function lasts(k: string, _nodeType: string | null) {
        return [
            // locs
            "start",
            "end",
            "line",
            "column",
            //
            "range",
            "loc",
        ].indexOf(k)
    }

    let entries = Object.entries(value)
    if (isNode) {
        entries = entries.filter(
            ([k]) => k !== "parent" && k !== "start" && k !== "end",
        )
    }
    const nodeType: string | null = isNode ? value.type : null

    return Object.fromEntries(
        entries.sort(([a], [b]) => {
            const c =
                firsts(a, nodeType) - firsts(b, nodeType) ||
                lasts(a, nodeType) - lasts(b, nodeType)
            if (c) {
                return c
            }
            return a < b ? -1 : a > b ? 1 : 0
        }),
    )
}
