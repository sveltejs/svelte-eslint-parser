<template>
    <div class="ast-explorer-root">
        <div class="ast-tools">{{ time }}<AstOptions v-model="options" /></div>
        <div class="ast-explorer">
            <MonacoEditor
                ref="sourceEditor"
                v-model="svelteValue"
                language="html"
                @focus-editor-text="handleFocus('source')"
                @change-cursor-position="handleCursor($event, 'source')"
            />
            <MonacoEditor
                ref="jsonEditor"
                :model-value="astJson.json"
                language="json"
                read-only
                @focus-editor-text="handleFocus('json')"
                @change-cursor-position="handleCursor($event, 'json')"
            />
        </div>
    </div>
</template>

<script>
// eslint-disable-next-line eslint-comments/disable-enable-pair -- ignore
/* eslint-disable no-useless-escape -- ignore */
import MonacoEditor from "./MonacoEditor.vue"
import AstOptions from "./AstOptions.vue"
import * as svelteEslintParser from "../../.."

export default {
    name: "AstExplorer",
    components: { MonacoEditor, AstOptions },
    data() {
        return {
            options: {
                showLocations: false,
            },
            svelteValue: `<script>
	let a = 1;
	let b = 2;
<\/script>

<input type="number" bind:value={a}>
<input type="number" bind:value={b}>

<p>{a} + {b} = {a + b}</p>`,
            astJson: {},
            modeEditor: "",
            time: "",
        }
    },
    watch: {
        options: {
            handler: "refresh",
            deep: true,
        },
        svelteValue: {
            handler: "refresh",
            immediate: true,
        },
    },
    methods: {
        refresh() {
            let ast
            const start = Date.now()
            try {
                ast = svelteEslintParser.parseForESLint(this.svelteValue).ast
            } catch (e) {
                ast = {
                    message: e.message,
                    ...e,
                }
            }
            const time = Date.now() - start
            this.time = `${time}ms`
            const json = createAstJson(this.options, ast)
            this.astJson = json
        },
        handleFocus(editor) {
            this.modeEditor = editor
        },
        handleCursor(evt, editor) {
            if (this.modeEditor !== editor || !this.astJson) {
                return
            }

            const position = evt.position
            if (editor === "source") {
                const locData = findLoc(this.astJson, "sourceLoc")
                if (locData) {
                    this.$refs.jsonEditor.setCursorPosition(locData.jsonLoc)
                }
            } else if (editor === "json") {
                const locData = findLoc(this.astJson, "jsonLoc")
                if (locData) {
                    this.$refs.sourceEditor.setCursorPosition(
                        locData.sourceLoc,
                        { columnOffset: 1 },
                    )
                }
            }

            // eslint-disable-next-line require-jsdoc -- demo
            function findLoc(astJson, locName) {
                let locData = astJson.locations.find((l) =>
                    locInPoint(l[locName], position),
                )
                let nextLocData
                while (
                    locData &&
                    (nextLocData = locData.locations.find((l) =>
                        locInPoint(l[locName], position),
                    ))
                ) {
                    locData = nextLocData
                }
                return locData
            }

            // eslint-disable-next-line require-jsdoc -- demo
            function locInPoint(loc, pos) {
                if (
                    loc.start.line < pos.lineNumber &&
                    pos.lineNumber < loc.end.line
                ) {
                    return true
                }
                if (
                    loc.start.line === pos.lineNumber &&
                    pos.lineNumber === loc.end.line
                ) {
                    return (
                        loc.start.column <= pos.column &&
                        pos.column < loc.end.column
                    )
                }
                if (
                    loc.start.line === pos.lineNumber &&
                    pos.lineNumber < loc.end.line
                ) {
                    return loc.start.column <= pos.column
                }
                if (
                    loc.start.line < pos.lineNumber &&
                    pos.lineNumber === loc.end.line
                ) {
                    return pos.column < loc.end.column
                }
                return false
            }
        },
    },
}

class AstJsonContext {
    constructor() {
        this.json = ""
        this.jsonPosition = { line: 1, column: 1 }
        this.locations = []
        this._indentOffset = 0
        this._stack = null
    }

    pushNode(node) {
        this._stack = {
            upper: this._stack,
            node,
            jsonLocStart: { ...this.jsonPosition },
            locations: [],
        }
    }

    popNode() {
        const loc = {
            node: this._stack.node,
            sourceLoc: this._stack.node.loc,
            jsonLoc: {
                start: this._stack.jsonLocStart,
                end: { ...this.jsonPosition },
            },
            locations: this._stack.locations,
        }

        this._stack = this._stack.upper
        if (this._stack) {
            this._stack.locations.push(loc)
        } else {
            this.locations.push(loc)
        }
    }

    appendText(text) {
        const str = String(text)
        this.json += str
        const lines = str.split("\n")
        if (lines.length > 1) {
            this.jsonPosition = {
                line: this.jsonPosition.line + lines.length - 1,
                column: lines.pop().length + 1,
            }
        } else {
            this.jsonPosition.column += str.length
        }
        return this
    }

    appendIndent() {
        return this.appendText("  ".repeat(this._indentOffset))
    }

    indent() {
        this._indentOffset++
        return this
    }

    outdent() {
        this._indentOffset--
        return this
    }
}

/**
 * Build AST JSON
 */
function createAstJson(options, value) {
    const ctx = new AstJsonContext()
    processValue(options, ctx, value)
    return ctx
}

// eslint-disable-next-line require-jsdoc -- ignore
function processValue(options, ctx, value) {
    const type = typeof value
    if (
        type === "string" ||
        type === "number" ||
        type === "boolean" ||
        value === null
    ) {
        ctx.appendText(JSON.stringify(value))
        return
    } else if (type !== "object") {
        ctx.appendText('"?"')
        return
    }
    if (Array.isArray(value)) {
        ctx.appendText("[\n").indent()
        const arr = [...value]
        while (arr.length) {
            ctx.appendIndent()
            const e = arr.shift()
            processValue(options, ctx, e)
            if (arr.length) {
                ctx.appendText(",")
            }
            ctx.appendText("\n")
        }
        ctx.outdent().appendIndent().appendText("]")
    } else {
        let entries = Object.entries(value)
        const valueIsNode = isNode(value)
        if (valueIsNode) {
            ctx.pushNode(value)
            const typeEntry = entries.find(([key]) => key === "type")
            const locEntries = options.showLocations
                ? entries.filter(([key]) => key === "loc" || key === "range")
                : []
            entries = entries.filter(
                ([key]) =>
                    key !== "type" &&
                    key !== "loc" &&
                    key !== "range" &&
                    key !== "parent",
            )
            if (typeEntry) entries.unshift(typeEntry)
            entries.push(...locEntries)
        }
        ctx.appendText("{\n").indent()
        while (entries.length) {
            ctx.appendIndent()
            const [key, val] = entries.shift()
            processValue(options, ctx, key)
            ctx.appendText(": ")
            processValue(options, ctx, val)
            if (entries.length) {
                ctx.appendText(",")
            }
            ctx.appendText("\n")
        }
        ctx.outdent().appendIndent().appendText("}")

        if (valueIsNode) {
            ctx.popNode()
        }
    }
}

/**
 * Check if given value is node
 */
function isNode(value) {
    return (
        value != null &&
        Array.isArray(value.range) &&
        "loc" in value &&
        "type" in value
    )
}
</script>

<style scoped>
.ast-explorer-root {
    min-width: 1px;
    min-height: 1px;
    display: flex;
    flex-direction: column;
    height: 100%;
}
.ast-tools {
    text-align: right;
}
.ast-explorer {
    min-width: 1px;
    display: flex;
    height: 100%;
}
</style>
