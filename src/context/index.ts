import fs from "fs"
import path from "path"
import type { Comment, Locations, Position, Token } from "../ast"
import type ESTree from "estree"
import { ScriptLetContext } from "./script-let"
import { LetDirectiveCollections } from "./let-directive-collection"
import { getParserName } from "../parser/resolve-parser"

export class ScriptsSourceCode {
    private raw: string

    private trimmedRaw: string

    public readonly attrs: Record<string, string | undefined>

    private _appendScriptLets: string | null = null

    public separateIndexes: number[] = []

    public constructor(
        script: string,
        attrs: Record<string, string | undefined>,
    ) {
        this.raw = script
        this.trimmedRaw = script.trimEnd()
        this.attrs = attrs
        this.separateIndexes = [script.length]
    }

    public get vcode(): string {
        if (this._appendScriptLets == null) {
            return this.raw
        }
        return this.trimmedRaw + this._appendScriptLets
    }

    public addLet(letCode: string): { start: number; end: number } {
        if (this._appendScriptLets == null) {
            this._appendScriptLets = ""
            this.separateIndexes = [this.vcode.length, this.vcode.length + 1]
            this._appendScriptLets += "\n;"
            const after = this.raw.slice(this.vcode.length)
            this._appendScriptLets += after
        }
        const start = this.vcode.length
        this._appendScriptLets += letCode
        return {
            start,
            end: this.vcode.length,
        }
    }

    public stripCode(start: number, end: number): void {
        this.raw =
            this.raw.slice(0, start) +
            this.raw.slice(start, end).replace(/[^\n\r ]/g, " ") +
            this.raw.slice(end)
        this.trimmedRaw =
            this.trimmedRaw.slice(0, start) +
            this.trimmedRaw.slice(start, end).replace(/[^\n\r ]/g, " ") +
            this.trimmedRaw.slice(end)
    }
}
export type ContextSourceCode = {
    template: string
    scripts: ScriptsSourceCode
}
export class Context {
    public readonly code: string

    public readonly parserOptions: any

    public readonly sourceCode: ContextSourceCode

    public readonly tokens: Token[] = []

    public readonly comments: Comment[] = []

    private readonly locs: LinesAndColumns

    private readonly locsMap = new Map<number, Position>()

    public readonly scriptLet: ScriptLetContext

    public readonly letDirCollections = new LetDirectiveCollections()

    private state: { isTypeScript?: boolean } = {}

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
        const after = code.slice(start)
        templateCode += after
        scriptCode += after.replace(/[^\n\r ]/g, " ")

        this.sourceCode = {
            template: templateCode,
            scripts: new ScriptsSourceCode(scriptCode, scriptAttrs),
        }
        this.scriptLet = new ScriptLetContext(this)
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
    public getText(
        range: { start: number; end: number } | ESTree.Node,
    ): string {
        return this.code.slice((range as any).start, (range as any).end)
    }

    public isTypeScript(): boolean {
        if (this.state.isTypeScript != null) {
            return this.state.isTypeScript
        }
        const lang = this.sourceCode.scripts.attrs.lang
        if (!lang) {
            return (this.state.isTypeScript = false)
        }
        const parserName = getParserName(
            this.sourceCode.scripts.attrs,
            this.parserOptions?.parser,
        )
        if (parserName === "@typescript-eslint/parser") {
            return (this.state.isTypeScript = true)
        }
        if (parserName.includes("@typescript-eslint/parser")) {
            let targetPath = parserName
            while (targetPath) {
                const pkgPath = path.join(targetPath, "package.json")
                if (fs.existsSync(pkgPath)) {
                    try {
                        return (this.state.isTypeScript =
                            JSON.parse(fs.readFileSync(pkgPath, "utf-8"))
                                ?.name === "@typescript-eslint/parser")
                    } catch {
                        return (this.state.isTypeScript = false)
                    }
                }
                const parent = path.dirname(targetPath)
                if (targetPath === parent) {
                    break
                }
                targetPath = parent
            }
        }

        return (this.state.isTypeScript = false)
    }

    public stripScriptCode(start: number, end: number): void {
        this.sourceCode.scripts.stripCode(start, end)
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
                /(?<key>[^\s=]+)(?:=(?:"(?<val1>[^"]*)"|'(?<val2>[^"]*)'|(?<val3>[^\s=]+)))?/gu
            const attrs: Record<string, string | undefined> = {}
            let attrRes
            while ((attrRes = attrRe.exec(attributes))) {
                attrs[attrRes.groups!.key] =
                    (attrRes.groups!.val1 ||
                        attrRes.groups!.val2 ||
                        attrRes.groups!.val3) ??
                    null
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
        const lineNumber = sortedLastIndex(this.lineStartIndices, index)
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

/**
 * Uses a binary search to determine the highest index at which value should be inserted into array in order to maintain its sort order.
 */
function sortedLastIndex(array: number[], value: number): number {
    let lower = 0
    let upper = array.length

    while (lower < upper) {
        const mid = Math.floor(lower + (upper - lower) / 2)
        const target = array[mid]
        if (target < value) {
            lower = mid + 1
        } else if (target > value) {
            upper = mid
        } else {
            return mid + 1
        }
    }

    return upper
}
