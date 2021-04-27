<template>
    <div class="sns-bar">
        <div class="sns">
            <a
                class="github-button"
                href="https://github.com/ota-meshi/svelte-eslint-parser"
                data-show-count="true"
                aria-label="Star ota-meshi/svelte-eslint-parser on GitHub"
                >Star</a
            >
            <a href="https://www.npmjs.com/package/svelte-eslint-parser">
                <img
                    src="https://img.shields.io/npm/v/svelte-eslint-parser.svg"
                    alt="npm"
                />
            </a>
        </div>
    </div>
</template>

<script>
let timeoutId = null

/**
 * setup
 */
function setup() {
    if (timeoutId) {
        clearTimeout(timeoutId)
    }
    timeoutId = setTimeout(() => {
        ;(function (d, s, id) {
            const [fjs] = d.getElementsByTagName(s)
            if (d.getElementById(id)) {
                return
            }
            const js = d.createElement(s)
            js.id = id
            js.src = "https://buttons.github.io/buttons.js"
            fjs.parentNode.insertBefore(js, fjs)
        })(document, "script", "gh-buttons")
    }, 500)
}

export default {
    name: "SnsBar",
    mounted() {
        setup()
    },
}
</script>

<style scoped lang="postcss">
.sns-bar {
    display: flex;
    align-items: flex-end;
    padding-left: 8px;
    padding-right: 8px;
}
.sns-bar .sns {
    display: flex;
    align-items: flex-start;
}

.sns-bar .sns > * {
    vertical-align: top !important;
    margin-left: 4px;
    height: 23px !important;
}
</style>
