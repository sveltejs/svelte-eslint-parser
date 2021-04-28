<template>
    <div class="playground-root">
        <div class="playground-tools"></div>
        <div class="playground-content">
            <RulesSettings
                ref="settings"
                v-model:rules="rules"
                class="rules-settings"
            />
            <div class="editor-content">
                <ESLintEditor
                    v-model="code"
                    :rules="rules"
                    class="eslint-playground"
                    @update-messages="onUpdateMessages"
                />
                <div class="messages">
                    <ol>
                        <li
                            v-for="(msg, i) in messages"
                            :key="
                                msg.line +
                                ':' +
                                msg.column +
                                ':' +
                                msg.ruleId +
                                '@' +
                                i
                            "
                            class="message"
                        >
                            [{{ msg.line }}:{{ msg.column }}]:
                            {{ msg.message }} (<a
                                :href="getURL(msg.ruleId)"
                                target="_blank"
                            >
                                {{ msg.ruleId }} </a
                            >)
                        </li>
                    </ol>
                </div>
            </div>
        </div>
    </div>
</template>

<script>
import ESLintEditor from "./ESLintEditor.vue"
import RulesSettings from "./RulesSettings.vue"
import { deserializeState, serializeState } from "./scripts/state"
import { DEFAULT_RULES_CONFIG, getURL } from "./scripts/rules.js"

const DEFAULT_CODE =
    `<script>
    let a = 1;
    let b = 2;
<` +
    `/script>

<input type="number" bind:value={a}>
<input type="number" bind:value={b}>

<p>{a} + {b} = {a + b}</p>`

export default {
    name: "ESLintPlayground",
    components: { ESLintEditor, RulesSettings },
    data() {
        const serializedString =
            (typeof window !== "undefined" && window.location.hash.slice(1)) ||
            ""
        const state = deserializeState(serializedString)
        return {
            code: state.code || DEFAULT_CODE,
            rules: state.rules || Object.assign({}, DEFAULT_RULES_CONFIG),
            messages: [],
        }
    },
    computed: {
        serializedString() {
            const defaultCode = DEFAULT_CODE
            const defaultRules = DEFAULT_RULES_CONFIG
            const code = defaultCode === this.code ? undefined : this.code
            const rules = equalsRules(defaultRules, this.rules)
                ? undefined
                : this.rules
            const serializedString = serializeState({
                code,
                rules,
            })
            return serializedString
        },
    },
    watch: {
        serializedString(serializedString) {
            if (typeof window !== "undefined") {
                window.location.replace(`#${serializedString}`)
            }
        },
    },
    mounted() {
        if (typeof window !== "undefined") {
            window.addEventListener("hashchange", this.onUrlHashChange)
        }
    },
    beforeDestroey() {
        if (typeof window !== "undefined") {
            window.removeEventListener("hashchange", this.onUrlHashChange)
        }
    },
    methods: {
        onUpdateMessages(messages) {
            this.messages = messages
        },
        getURL(ruleId) {
            return getURL(ruleId) || ""
        },
        onUrlHashChange() {
            const serializedString =
                (typeof window !== "undefined" &&
                    window.location.hash.slice(1)) ||
                ""
            if (serializedString !== this.serializedString) {
                const state = deserializeState(serializedString)
                this.code = state.code || DEFAULT_CODE
                this.rules =
                    state.rules || Object.assign({}, DEFAULT_RULES_CONFIG)
                this.script = state.script
            }
        },
    },
}

/** */
function equalsRules(a, b) {
    const akeys = Object.keys(a).filter((k) => a[k] !== "off")
    const bkeys = Object.keys(b).filter((k) => b[k] !== "off")
    if (akeys.length !== bkeys.length) {
        return false
    }

    for (const k of akeys) {
        if (a[k] !== b[k]) {
            return false
        }
    }
    return true
}
</script>
<style scoped>
.playground-root {
    height: 100%;
}
.playground-tools {
    height: 24px;
}
.playground-content {
    display: flex;
    flex-wrap: wrap;
    height: calc(100% - 16px);
    border: 1px solid #cfd4db;
    background-color: #282c34;
    color: #f8c555;
}

.playground-content > .rules-settings {
    height: 100%;
    overflow: auto;
    width: 25%;
    box-sizing: border-box;
}

.playground-content > .editor-content {
    height: 100%;
    flex: 1;
    display: flex;
    flex-direction: column;
    border-left: 1px solid #cfd4db;
    min-width: 1px;
}

.playground-content > .editor-content > .eslint-playground {
    height: 100%;
    width: 100%;
    box-sizing: border-box;
    padding: 3px;
}

.playground-content > .editor-content > .messages {
    height: 30%;
    width: 100%;
    overflow: auto;
    box-sizing: border-box;
    border-top: 1px solid #cfd4db;
    padding: 8px;
    font-size: 12px;
}
</style>
