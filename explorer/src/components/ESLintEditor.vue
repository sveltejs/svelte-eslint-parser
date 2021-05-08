<template>
    <MonacoEditor
        ref="jsonEditor"
        :model-value="modelValue"
        :right-value="fixedValue"
        language="html"
        diff-editor
        :markers="leftMarkers"
        :right-markers="rightMarkers"
        @update:model-value="onUpdate"
    />
</template>

<script>
import Linter from "eslint4b"
import MonacoEditor from "./MonacoEditor.vue"
import * as svelteEslintParser from "../../.."
import { monacoEditorLoad } from "./scripts/monaco-loader"

const linter = new Linter()
linter.defineParser("svelte-eslint-parser", svelteEslintParser)

export default {
    components: { MonacoEditor },
    props: {
        modelValue: {
            type: String,
            default: "",
        },
        rules: {
            type: Object,
            default() {
                return {}
            },
        },
        useEslintPluginSvelte3: {
            type: Boolean,
        },
    },
    emits: ["update:modelValue", "updateMessages", "time"],
    data() {
        return {
            fixedValue: this.modelValue,
            leftMarkers: [],
            rightMarkers: [],
        }
    },
    watch: {
        rules: {
            handler() {
                this.lint(this.modelValue)
            },
            deep: true,
        },
        useEslintPluginSvelte3() {
            this.lint(this.modelValue)
        },
    },
    mounted() {
        this.lint(this.modelValue)
    },
    methods: {
        async getEslintPluginSvelte3Options() {
            const pluginSvelte3 = await import("eslint-plugin-svelte3")
            return {
                preprocess: pluginSvelte3.processors.svelte3.preprocess,
                postprocess: pluginSvelte3.processors.svelte3.postprocess,
            }
        },
        async lint(code) {
            const config = {
                parser: this.useEslintPluginSvelte3
                    ? undefined
                    : "svelte-eslint-parser",
                parserOptions: {
                    ecmaVersion: 2020,
                    sourceType: "module",
                },
                rules: this.rules,
                env: {
                    browser: true,
                    es2021: true,
                },
            }
            const options = this.useEslintPluginSvelte3
                ? await this.getEslintPluginSvelte3Options()
                : {}

            const start = Date.now()
            const messages = linter.verify(code, config, options)
            const time = Date.now() - start

            this.$emit("time", time)

            this.$emit("updateMessages", messages)

            const fixResult = linter.verifyAndFix(code, config, options)
            this.fixedValue = fixResult.output

            this.leftMarkers = await Promise.all(messages.map(messageToMarker))
            this.rightMarkers = await Promise.all(
                fixResult.messages.map(messageToMarker),
            )
        },
        onUpdate(value) {
            this.$emit("update:modelValue", value)
            this.lint(value)
        },
    },
}

/** message to marker */
async function messageToMarker(message) {
    const monaco = await monacoEditorLoad
    const rule = message.ruleId && linter.getRules().get(message.ruleId)
    const docUrl = rule && rule.meta && rule.meta.docs && rule.meta.docs.url
    const startLineNumber = ensurePositiveInt(message.line, 1)
    const startColumn = ensurePositiveInt(message.column, 1)
    const endLineNumber = ensurePositiveInt(message.endLine, startLineNumber)
    const endColumn = ensurePositiveInt(message.endColumn, startColumn + 1)
    const code = docUrl
        ? { value: message.ruleId, link: docUrl, target: docUrl }
        : message.ruleId || "FATAL"
    return {
        code,
        severity: monaco.MarkerSeverity.Error,
        source: "ESLint",
        message: message.message,
        startLineNumber,
        startColumn,
        endLineNumber,
        endColumn,
    }
}

/**
 * Ensure that a given value is a positive value.
 * @param {number|undefined} value The value to check.
 * @param {number} defaultValue The default value which is used if the `value` is undefined.
 * @returns {number} The positive value as the result.
 */
function ensurePositiveInt(value, defaultValue) {
    return Math.max(1, (value !== undefined ? value : defaultValue) | 0)
}
</script>

<style></style>
