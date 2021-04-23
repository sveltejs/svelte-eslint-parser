<template>
    <label class="ast-options"
        ><input
            type="checkbox"
            :checked="modelValue.showLocations"
            @change="updateShowLocations($event.target.checked)"
        />Locations</label
    >
</template>

<script>
export default {
    name: "AstOptions",
    props: {
        modelValue: {
            type: Object,
            default() {
                return {}
            },
        },
    },
    emits: ["update:modelValue"],
    methods: {
        updateShowLocations(newValue) {
            this.$emit("update:modelValue", {
                ...this.modelValue,
                showLocations: newValue,
            })
        },
    },
}
</script>

<style scoped>
.ast-options {
    padding-left: 16px;
}
</style>
