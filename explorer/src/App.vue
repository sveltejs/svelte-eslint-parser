<template>
    <header class="header">
        <label class="title">svelte-eslint-parser</label>
        <RouterLink class="menu" :to="{ name: 'ast' }">AST</RouterLink>
        <RouterLink class="menu" :to="{ name: 'playground' }"
            >Playgroud</RouterLink
        >
        <SnsBar />
        <a
            href="https://github.com/ota-meshi/svelte-eslint-parser"
            class="github-link"
            >View on GitHub</a
        >
    </header>
    <main class="main">
        <RouterView />
    </main>
</template>

<script>
import SnsBar from "./components/SnsBar.vue"

export default {
    name: "App",
    components: {
        SnsBar,
    },
}
</script>
<style scoped>
.header {
    height: 32px;
    display: flex;
    border-bottom: 1px #ddd solid;
}
.title {
    font-size: 120%;
    display: flex;
    align-items: center;
    padding-right: 16px;
}
.menu {
    padding: 4px 16px;
    border-radius: 4px 4px 0 0;
    border-color: #ddd #ddd transparent #ddd;
    border-style: solid;
    border-width: 1px;
}
.router-link-exact-active {
    margin-bottom: -2px;
    border-bottom: 2px solid #46bd87;
}
.github-link {
    display: flex;
    align-items: center;
}
.main {
    position: relative;
    height: calc(100vh - 32px - 16px);
}
</style>
