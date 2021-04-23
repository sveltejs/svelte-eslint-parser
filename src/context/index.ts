import type { Comment, Locations, Position, Token } from "../ast"
import lodash from "lodash"
import type ESTree from "estree"
import type { ScopeManager } from "eslint-scope"
import { TemplateScopeManager } from "./template-scope-manager"

export class Context {
    public readonly code: string

    public readonly parserOptions: any

    public readonly sourceCode: {
        svelte: string
        script: {
            code: string
            attrs: Record<string, string | undefined>
        }
    }

    public readonly tokens: Token[] = []

    public readonly comments: Comment[] = []

    private readonly locs: LinesAndColumns

    private readonly locsMap = new Map<number, Position>()

    private _templateScopeManager: TemplateScopeManager | null = null

    public constructor(code: string, parserOptions: any) {
        this.code = code
        this.parserOptions = parserOptions
        this.locs = new LinesAndColumns(code)
        const sourceCode: {
            svelte: string
            script: {
                code: string
                ranges: {
                    code: [number, number]
                    tag: [number, number]
                }[]
                attrs: Record<string, string | undefined>
            }
        } = {
            svelte: code,
            script: {
                code: code.replace(/[^\n\r ]/g, " "),
                ranges: [],
                attrs: {},
            },
        }
        for (const script of extractScriptBlocks(code)) {
            sourceCode.svelte =
                sourceCode.svelte.slice(0, script.codeRange[0]) +
                script.code.replace(/[^\n\r ]/g, " ") +
                sourceCode.svelte.slice(script.codeRange[1])
            sourceCode.script.code =
                sourceCode.script.code.slice(0, script.codeRange[0]) +
                script.code +
                sourceCode.script.code.slice(script.codeRange[1])
            sourceCode.script.ranges.push({
                code: script.codeRange,
                tag: script.tagRange,
            })
            sourceCode.script.attrs = Object.assign(
                sourceCode.script.attrs,
                script.attrs,
            )
        }
        this.sourceCode = sourceCode
    }

    public getLocFromIndex(index: number): { line: number; column: number } {
        let loc = this.locsMap.get(index)
        if (!loc) {
            loc = this.locs.getLocFromIndex(index)
            this.locsMap.set(index, loc)
        }
        return {
            line: loc.line,
            column: loc.column,
        }
    }

    /**
     * Get the location information of the given node.
     * @param node The node.
     */
    public getConvertLocation(
        node: { start: number; end: number } | ESTree.Node,
    ): Locations {
        const { start, end } = node as any

        return {
            range: [start, end],
            loc: {
                start: this.getLocFromIndex(start),
                end: this.getLocFromIndex(end),
            },
        }
    }

    public addComment(comment: Comment): void {
        this.comments.push(comment)
    }

    /**
     * Add token to tokens
     */
    public addToken(
        type: Token["type"],
        range: { start: number; end: number },
    ): Token {
        const token = {
            type,
            value: this.getText(range),
            ...this.getConvertLocation(range),
        }
        this.tokens.push(token)
        return token
    }

    /**
     * get text
     */
    public getText(range: { start: number; end: number }): string {
        return this.code.slice(range.start, range.end)
    }

    public readyScopeManager(scopeManager: ScopeManager): void {
        this._templateScopeManager = new TemplateScopeManager(scopeManager)
    }

    public get templateScopeManager(): TemplateScopeManager {
        return this._templateScopeManager!
    }
}

/** Extract <script> blocks */
function* extractScriptBlocks(
    code: string,
): IterableIterator<{
    code: string
    codeRange: [number, number]
    tag: string
    tagRange: [number, number]
    attrs: Record<string, string | undefined>
}> {
    const scriptRe = /<script(\s[\s\S]*?)?>([\s\S]*?)<\/script>/giu
    let res
    while ((res = scriptRe.exec(code))) {
        const [tag, attributes = "", context] = res
        const tagRange: [number, number] = [res.index, scriptRe.lastIndex]
        const codeRange: [number, number] = [
            tagRange[0] + 8 + attributes.length,
            tagRange[1] - 9,
        ]

        const attrRe = /(<key>[^\s=]+)(?:=(?:"(<val>[^"]*)"|'(<val>[^"]*)'|(<val>[^\s=]+)))?/giu
        const attrs: Record<string, string | undefined> = {}
        while ((res = attrRe.exec(attributes))) {
            attrs[res.groups!.key] = res.groups!.val
        }
        yield {
            code: context,
            codeRange,
            tag,
            tagRange,
            attrs,
        }
    }
}

export class LinesAndColumns {
    private readonly lineStartIndices: number[]

    public constructor(code: string) {
        const len = code.length
        const lineStartIndices = [0]
        for (let index = 0; index < len; index++) {
            const c = code[index]
            if (c === "\r") {
                const next = code[index + 1] || ""
                if (next === "\n") {
                    index++
                }
                lineStartIndices.push(index + 1)
            } else if (c === "\n") {
                lineStartIndices.push(index + 1)
            }
        }
        this.lineStartIndices = lineStartIndices
    }

    public getLocFromIndex(index: number): { line: number; column: number } {
        const lineNumber = lodash.sortedLastIndex(this.lineStartIndices, index)
        return {
            line: lineNumber,
            column: index - this.lineStartIndices[lineNumber - 1],
        }
    }

    public getIndexFromLoc(loc: { line: number; column: number }): number {
        const lineStartIndex = this.lineStartIndices[loc.line - 1]
        const positionIndex = lineStartIndex + loc.column

        return positionIndex
    }
}
