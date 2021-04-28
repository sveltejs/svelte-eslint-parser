<template>
    <div ref="monaco" class="root"></div>
</template>

<script>
import { monacoEditorLoad } from "./scripts/monaco-loader"
export default {
    name: "MonacoEditor",
    props: {
        modelValue: {
            type: String,
            default: "",
        },
        rightValue: {
            type: String,
            default: "",
        },
        language: {
            type: String,
            default: "json",
        },
        readOnly: Boolean,
        diffEditor: Boolean,
        markers: {
            type: Array,
            default() {
                return []
            },
        },
        rightMarkers: {
            type: Array,
            default() {
                return []
            },
        },
    },
    emits: ["update:modelValue", "changeCursorPosition", "focusEditorText"],
    watch: {
        modelValue(newValue) {
            const vm = this
            if (vm.setLeftValue) {
                vm.setLeftValue(newValue)
            }
        },
        rightValue(newValue) {
            const vm = this
            if (vm.setRightValue) {
                vm.setRightValue(newValue)
            }
        },
        markers: {
            handler(markers) {
                const vm = this
                if (vm.setLeftMarkers) {
                    vm.setLeftMarkers(markers)
                }
            },
            deep: true,
        },
        rightMarkers: {
            handler(markers) {
                const vm = this
                if (vm.setRightMarkers) {
                    vm.setRightMarkers(markers)
                }
            },
            deep: true,
        },
    },
    beforeUnmount() {
        dispose(this.editor)
        dispose(this.codeActionProviderDisposable)
        this.$refs.monaco.innerHTML = ""
        this.editor = null
    },
    async mounted() {
        const monaco = await monacoEditorLoad
        const vm = this
        const options = Object.assign(
            {
                value: vm.modelValue,
                readOnly: vm.readOnly,
                theme: "vs-dark",
                language: vm.language,
                automaticLayout: true,
                fontSize: 14,
                // tabSize: 2,
                minimap: {
                    enabled: false,
                },
                renderControlCharacters: true,
                renderIndentGuides: true,
                renderValidationDecorations: "on",
                renderWhitespace: "boundary",
                scrollBeyondLastLine: false,
            },
            vm.options,
        )

        if (vm.diffEditor) {
            vm.editor = monaco.editor.createDiffEditor(vm.$refs.monaco, {
                originalEditable: true,
                ...options,
            })
            const original = monaco.editor.createModel(
                vm.modelValue,
                vm.language,
            )
            const modified = monaco.editor.createModel(
                vm.rightValue,
                vm.language,
            )
            const leftEditor = vm.editor.getOriginalEditor()
            const rightEditor = vm.editor.getModifiedEditor()
            rightEditor.updateOptions({ readOnly: true })
            vm.editor.setModel({ original, modified })
            original.onDidChangeContent(() => {
                const value = original.getValue()
                if (vm.modelValue !== value) {
                    this.fixedValue = value
                    this.$emit("update:modelValue", value)
                }
            })

            vm.setLeftValue = (modelValue) => {
                const value = original.getValue()
                if (modelValue !== value) {
                    original.setValue(modelValue)
                }
            }
            vm.setRightValue = (modelValue) => {
                const value = modified.getValue()
                if (modelValue !== value) {
                    modified.setValue(modelValue)
                }
            }
            vm.setLeftMarkers = (markers) => {
                vm.updateMarkers(leftEditor, markers)
            }
            vm.setRightMarkers = (markers) => {
                vm.updateMarkers(rightEditor, markers)
            }

            vm.setLeftMarkers(vm.markers)
            vm.setRightMarkers(vm.rightMarkers)
        } else {
            vm.editor = monaco.editor.create(vm.$el, options)
            vm.editor.onDidChangeModelContent((evt) => {
                const value = vm.editor.getValue()
                if (vm.modelValue !== value) {
                    this.fixedValue = value
                    vm.$emit("update:modelValue", value, evt)
                }
            })
            vm.editor.onDidChangeCursorPosition((evt) => {
                vm.$emit("changeCursorPosition", evt)
            })
            vm.editor.onDidFocusEditorText((evt) => {
                vm.$emit("focusEditorText", evt)
            })
            vm.setLeftValue = (modelValue) => {
                const value = vm.editor.getValue()
                if (modelValue !== value) {
                    vm.editor.setValue(modelValue)
                }
            }
            vm.setRightValue = () => {
                /* noop */
            }
            vm.setLeftMarkers = (markers) => {
                vm.updateMarkers(vm.editor, markers)
            }
            vm.setRightMarkers = () => {
                /* noop */
            }

            vm.setLeftMarkers(vm.markers)
        }
    },
    methods: {
        setCursorPosition(loc, { columnOffset = 0 } = {}) {
            const vm = this
            if (vm.editor) {
                const leftEditor = vm.diffEditor
                    ? vm.editor?.getOriginalEditor()
                    : vm.editor
                leftEditor.setSelection({
                    startLineNumber: loc.start.line,
                    startColumn: loc.start.column + columnOffset,
                    endLineNumber: loc.end.line,
                    endColumn: loc.end.column + columnOffset,
                })
            }
        },
        async updateMarkers(editor, markers) {
            const monaco = await monacoEditorLoad
            const model = editor.getModel()
            const id = editor.getId()
            monaco.editor.setModelMarkers(
                model,
                id,
                JSON.parse(JSON.stringify(markers)),
            )
        },
    },
}

/**
 * Dispose.
 * @param {any} x The target object.
 * @returns {void}
 */
function dispose(x) {
    if (x == null) {
        return
    }
    if (x.getOriginalEditor) {
        dispose(x.getOriginalEditor())
    }
    if (x.getModifiedEditor) {
        dispose(x.getModifiedEditor())
    }
    if (x.getModel) {
        dispose(x.getModel())
    }
    if (x.dispose) {
        x.dispose()
    }
}
</script>
<style scoped>
.root {
    width: 100%;
    height: 100%;
}
</style>
