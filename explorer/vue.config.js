module.exports = {
    publicPath: "/svelte-eslint-parser/",
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
