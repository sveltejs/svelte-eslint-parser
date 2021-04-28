module.exports = {
    publicPath: "/svelte-eslint-parser/",
    pages: {
        index: "src/main.js",
        playground: "src/main.js",
        scope: "src/main.js",
    },
    configureWebpack(_config, _isServer) {
        return {
            resolve: {
                alias: {
                    module: require.resolve("./shim/module"),
                },
            },
        }
    },
}
