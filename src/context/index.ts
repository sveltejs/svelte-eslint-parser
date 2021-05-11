import type { Comment, Locations, Position, Token } from "../ast"
import lodash from "lodash"
import type ESTree from "estree"
import type { ScopeManager } from "eslint-scope"
import { TemplateScopeManager } from "./template-scope-manager"

type ContextSourceCode = {
    template: string
    scripts: {
        code: string
        attrs: Record<string, string | undefined>
    }
}
export class Context {
    public readonly code: string

    public readonly parserOptions: any

    public readonly sourceCode: ContextSourceCode

    public readonly tokens: Token[] = []

    public readonly comments: Comment[] = []

    private readonly locs: LinesAndColumns

    private readonly locsMap = new Map<number, Position>()

    private _templateScopeManager: TemplateScopeManager | null = null

    public constructor(code: string, parserOptions: any) {
        this.code = code
        this.parserOptions = parserOptions
        this.locs = new LinesAndColumns(code)

        let templateCode = ""
        let scriptCode = ""
        let scriptAttrs: Record<string, string | undefined> = {}

        let start = 0
        for (const block of extractBlocks(code)) {
            const before = code.slice(start, block.codeRange[0])
            const blankCode = block.code.replace(/[^\n\r ]/g, " ")
            templateCode += before + blankCode
            if (block.tag === "script") {
                scriptCode += before.replace(/[^\n\r ]/g, " ") + block.code
                scriptAttrs = Object.assign(scriptAttrs, block.attrs)
            } else {
                scriptCode += before.replace(/[^\n\r ]/g, " ") + blankCode
            }
            start = block.codeRange[1]
        }
        const before = code.slice(start)
        templateCode += before
        scriptCode += before.replace(/[^\n\r ]/g, " ")

        this.sourceCode = {
            template: templateCode,
            scripts: {
                code: scriptCode,
                attrs: scriptAttrs,
            },
        }
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
function* extractBlocks(code: string): IterableIterator<{
    code: string
    codeRange: [number, number]
    attrs: Record<string, string | undefined>
    tag: "script" | "style"
}> {
    const startTagRe = /<(script|style)(\s[\s\S]*?)?>/giu
    const endScriptTagRe = /<\/script(?:\s[\s\S]*?)?>/giu
    const endStyleTagRe = /<\/style(?:\s[\s\S]*?)?>/giu
    let startTagRes
    while ((startTagRes = startTagRe.exec(code))) {
        const [startTag, tag, attributes = ""] = startTagRes
        const startTagStart = startTagRes.index
        const startTagEnd = startTagStart + startTag.length
        const endTagRe =
            tag.toLowerCase() === "script" ? endScriptTagRe : endStyleTagRe
        endTagRe.lastIndex = startTagRe.lastIndex
        const endTagRes = endTagRe.exec(code)
        if (endTagRes) {
            const endTagStart = endTagRes.index
            const codeRange: [number, number] = [startTagEnd, endTagStart]

            const attrRe =
                // eslint-disable-next-line regexp/no-unused-capturing-group -- maybe bug
                /(<key>[^\s=]+)(?:=(?:"(<val>[^"]*)"|'(<val>[^"]*)'|(<val>[^\s=]+)))?/giu
            const attrs: Record<string, string | undefined> = {}
            let attrRes
            while ((attrRes = attrRe.exec(attributes))) {
                attrs[attrRes.groups!.key] = attrRes.groups!.val
            }
            yield {
                code: code.slice(...codeRange),
                codeRange,
                attrs,
                tag: tag as "script" | "style",
            }
            startTagRe.lastIndex = endTagRe.lastIndex
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
